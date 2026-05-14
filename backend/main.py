import argparse
import json
import sys
import select
import time
import requests
import platform
import threading
from pathlib import Path
from typing import Any

# Ensure the backend directory is in sys.path for module discovery (especially for torch.load)
sys.path.insert(0, str(Path(__file__).parent))

from core.contracts import GOALS
from core.estimator import estimate_performance
from core.logging_utils import get_logger
from core.model_analyzer import analyze_model
from core.optimizer import optimize_model
from core.prompt_optimizer import optimize_prompt
from core.strategy_engine import get_strategy
from core.system_profiler import get_system_profile
from core.autotuner import autotune
from core.validation import ValidationError, set_global_seed, validate_goal
from core.utils import calculate_model_hash
from core.memoization import get_cached_strategy, save_strategy_to_cache
from core.autodiscovery import discover_server
from core.tui import SysAwareTUI, render_final_table, Live, box
from core.exporter import export_deployment_artifacts
from core.simulator import simulate_performance, VIRTUAL_HARDWARE


logger = get_logger("sysaware.cli")

# Global flag to enable heartbeat/telemetry after approval
IS_APPROVED = False

def check_approval(server_url: str, machine_id: str):
	"""Polls the server to see if this node has been approved."""
	global IS_APPROVED
	while not IS_APPROVED:
		try:
			url = f"{server_url.rstrip('/')}/api/fleet/join/status?machine_id={machine_id}"
			response = requests.get(url, timeout=5)
			if response.status_code == 200:
				status = response.json().get("status")
				if status == "approved":
					IS_APPROVED = True
					logger.info("Fleet join request APPROVED by admin.")
					break
				elif status == "rejected":
					logger.warning("Fleet join request REJECTED by admin.")
					break
		except Exception:
			pass
		time.sleep(5)

def start_heartbeat(server_url: str):
	"""Starts a background thread to send periodic heartbeats to the server."""
	from core.system_profiler import get_system_profile

	machine_id = f"{platform.node()}_{platform.system()}"
	profile = get_system_profile()
	
	def heartbeat_loop():
		global IS_APPROVED
		heartbeat_url = f"{server_url.rstrip('/')}/api/telemetry/heartbeat"
		while True:
			if IS_APPROVED:
				try:
					payload = {
						"machine_id": machine_id,
						"hardware_profile": profile,
						"status": "benchmarking"
					}
					requests.post(heartbeat_url, json=payload, timeout=5)
				except Exception:
					pass
			time.sleep(30)

	thread = threading.Thread(target=heartbeat_loop, daemon=True)
	thread.start()
	logger.info("Heartbeat service started (awaiting approval/active)")


def fetch_blacklist(server_url: str) -> list[str]:
	"""Fetches the global blacklist from the server."""
	import requests
	import platform
	
	machine_id = f"{platform.node()}_{platform.system()}"
	try:
		blacklist_url = f"{server_url.rstrip('/')}/api/telemetry/blacklist"
		response = requests.get(blacklist_url, timeout=5)
		if response.status_code == 200:
			data = response.json()
			# Filter blacklist to only include entries relevant to THIS machine
			return [entry["backend"] for entry in data.get("blacklist", []) if entry["machine_id"] == machine_id]
	except Exception as e:
		logger.warning(f"Could not fetch blacklist from {server_url}: {e}")
	return []


def report_blacklist(server_url: str, backend: str, reason: str):
	"""Reports a crashing backend to the server's blacklist."""
	import requests
	import platform
	
	machine_id = f"{platform.node()}_{platform.system()}"
	try:
		blacklist_url = f"{server_url.rstrip('/')}/api/telemetry/blacklist"
		payload = {
			"machine_id": machine_id,
			"backend": backend,
			"reason": reason
		}
		requests.post(blacklist_url, json=payload, timeout=5)
		logger.info(f"Reported crashing backend '{backend}' to global blacklist")
	except Exception as e:
		logger.warning(f"Could not report blacklist entry to {server_url}: {e}")


def parse_args(argv: list[str]) -> argparse.Namespace:
	parser = argparse.ArgumentParser(
		description="SysAware ML Optimizer CLI",
	)
	parser.add_argument(
		"--model-path",
		required=True,
		help="Path to a local .pt or .pth model file",
	)
	parser.add_argument(
		"--goal",
		default="balanced",
		choices=GOALS,
		help="Optimization goal",
	)
	parser.add_argument(
		"--seed",
		type=int,
		default=42,
		help="Global seed for deterministic behavior where possible",
	)
	parser.add_argument(
		"--json",
		action="store_true",
		help="Print the result as JSON instead of a human-readable summary",
	)
	parser.add_argument(
		"--optimize-prompt",
		action="store_true",
		help="Enable the optional prompt optimizer",
	)
	parser.add_argument(
		"--prompt-text",
		default="",
		help="Prompt text to optimize when --optimize-prompt is enabled",
	)
	parser.add_argument(
		"--prompt-type",
		default="general",
		choices=["general", "coding", "analysis", "creative"],
		help="Prompt intent used by the optional prompt optimizer",
	)
	parser.add_argument(
		"--unsafe-load",
		action="store_true",
		help="Allow arbitrary code execution by bypassing weights_only during model load",
	)
	parser.add_argument(
		"--server",
		help="URL of the central SysAware server for fleet telemetry (e.g. http://192.168.1.10:8000)",
	)
	parser.add_argument(
		"--export-deploy",
		action="store_true",
		help="Generate production-ready deployment artifacts (Dockerfile, runner, systemd) in the deploy/ directory",
	)
	parser.add_argument(
		"--simulate",
		choices=list(VIRTUAL_HARDWARE.keys()),
		help="Simulate performance on virtual target hardware",
	)
	return parser.parse_args(argv)


def report_telemetry(server_url: str, report: dict[str, Any]) -> None:
	"""Post the final report to a central ingestion server."""
	global IS_APPROVED
	if not IS_APPROVED:
		logger.debug("Telemetry reporting skipped (not approved).")
		return

	# Clean up report for transmission
	payload = {
		"machine_id": f"{platform.node()}_{platform.system()}",
		"model_hash": report.get("model_hash", "unknown"),
		"hardware_profile": report["system_profile"],
		"goal": report["goal"],
		"latency_range": report["best_result"]["latency_range_ms"],
		"memory_mb": report["best_result"]["memory_mb"],
		"decode_tokens_per_sec": report["best_result"].get("decode_tokens_per_sec"),
		"prefill_latency_ms": report["best_result"].get("prefill_latency_ms")
	}

	try:
		ingest_url = f"{server_url.rstrip('/')}/api/telemetry/ingest"
		response = requests.post(ingest_url, json=payload, timeout=5)
		if response.status_code == 200:
			logger.info(f"Successfully reported telemetry to {ingest_url}")
		else:
			logger.warning(f"Failed to report telemetry. Server returned {response.status_code}")
	except Exception as e:
		logger.warning(f"Could not connect to telemetry server {server_url}: {e}")


def load_model_from_path(model_path: str, unsafe_load: bool = False) -> Any:
	path = Path(model_path)
	if not path.exists():
		raise FileNotFoundError(f"Model file or directory not found: {model_path}")

	try:
		import torch
	except Exception as exc:  # pragma: no cover
		raise RuntimeError("Torch is required to load model files") from exc

	# Handle Directory-based models (e.g., Hugging Face / Transformers / Safetensors)
	if path.is_dir():
		dir_errors = []
		try:
			from transformers import AutoModel, AutoConfig
			# Check if it looks like a transformers model (has config.json)
			if (path / "config.json").exists():
				logger.info("Detected directory-based model. Attempting to load via transformers...")
				try:
					# Load model (can be sharded safetensors or pytorch_model.bin)
					model = AutoModel.from_pretrained(
						str(path), 
						torch_dtype="auto",
						device_map="auto",
						low_cpu_mem_usage=True,
						trust_remote_code=unsafe_load
					)
					return model
				except Exception as transformer_exc:
					msg = f"Transformers load failed: {transformer_exc}"
					logger.warning(msg)
					dir_errors.append(msg)
		except ImportError:
			logger.warning("Transformers not installed. Unable to load directory as AutoModel.")

		# Fallback: Treat directory as a collection of state_dicts
		st_files = list(path.glob("*.safetensors"))
		if st_files:
			try:
				from safetensors.torch import load_file
				combined_state_dict = {}
				for st_file in st_files:
					combined_state_dict.update(load_file(str(st_file), device="cpu"))
				return combined_state_dict
			except Exception as st_exc:
				msg = f"Safetensors load failed: {st_exc}"
				logger.warning(msg)
				dir_errors.append(msg)

		# If we are here, it means it is a directory but all our loaders failed.
		# Do NOT fall through to torch.load() which will raise IsADirectoryError.
		error_details = "\n- ".join(dir_errors)
		raise RuntimeError(
			f"Failed to load model directory '{model_path}'. All directory-based loaders failed:\n- {error_details}\n\n"
			"Ensure the directory contains a valid config.json and model weights (safetensors or .bin). "
			"If this model requires custom code, try again with --unsafe-load."
		)

	# Handle single Safetensors file
	if path.suffix == ".safetensors":
		try:
			from safetensors.torch import load_file
			return load_file(str(path), device="cpu")
		except Exception as exc:
			raise RuntimeError(f"Failed to load safetensors file '{model_path}': {exc}") from exc

	# Standard PyTorch load
	try:
		return torch.load(str(path), map_location="cpu", weights_only=not unsafe_load)
	except Exception as exc:
		if unsafe_load:
			raise RuntimeError(f"Failed to load model '{model_path}' with unsafe_load enabled: {exc}") from exc
		raise RuntimeError(
			f"Failed to load model '{model_path}' with weights_only=True: {exc}. "
			"If this is a full-module checkpoint, retry with --unsafe-load or use the GUI unsafe-load option. "
			"If it is a state_dict or directory-based model, use appropriate format."
		) from exc


def build_report(
	model_path: str,
	goal: str,
	system_profile: dict[str, Any],
	model_analysis: dict[str, Any],
	baseline: dict[str, Any],
	strategy: dict[str, Any],
	best_config: dict[str, Any],
	best_result: dict[str, Any],
	model_hash: str = "unknown",
	prompt_result: dict[str, Any] | None = None,
) -> dict[str, Any]:
	return {
		"model_path": model_path,
		"model_hash": model_hash,
		"goal": goal,
		"system_profile": system_profile,
		"model_analysis": model_analysis,
		"baseline": baseline,
		"strategy": strategy,
		"best_config": best_config,
		"best_result": best_result,
		"prompt_optimizer": prompt_result,
	}


def print_human_report(report: dict[str, Any]) -> None:
	render_final_table(report)


def run_pipeline(args: argparse.Namespace) -> dict[str, Any]:
	global IS_APPROVED
	goal = validate_goal(args.goal)
	set_global_seed(args.seed)

	system_profile = get_system_profile()
	model_hash = calculate_model_hash(args.model_path)
	machine_id = f"{platform.node()}_{platform.system()}"
	
	# Initialize TUI
	tui = SysAwareTUI(goal, args.model_path)
	tui.update_header(machine_id)
	tui.update_system_panel(system_profile)
	
	server_url = args.server
	
	# Start TUI Live View
	from rich.console import Console
	live_console = Console(file=sys.stderr) if getattr(args, "json", False) else None
	with Live(tui.layout, refresh_per_second=4, screen=not args.json, console=live_console):
		# Autodiscovery logic
		if not server_url:
			server_url = discover_server()

		# Handle join request and approval if server is present
		if server_url:
			try:
				join_url = f"{server_url.rstrip('/')}/api/fleet/join/request"
				requests.post(join_url, json={"machine_id": machine_id}, timeout=5)
				
				# Start heartbeat and approval poller
				start_heartbeat(server_url)
				threading.Thread(target=check_approval, args=(server_url, machine_id), daemon=True).start()
				
			except Exception as e:
				logger.warning(f"Failed to communicate join request: {e}")

		# 1. Strategy Memoization: Check Cache First
		cached_report = get_cached_strategy(model_hash, goal, system_profile)
		if cached_report:
			cached_report["model_path"] = args.model_path
			if server_url:
				report_telemetry(server_url, cached_report)
			return cached_report

		# 2. Blacklist: Fetch known-crashing backends
		blacklist = []
		if server_url:
			blacklist = fetch_blacklist(server_url)

		model = load_model_from_path(args.model_path, args.unsafe_load)
		model_analysis = analyze_model(model)
		baseline = estimate_performance(model, system_profile)
		strategy = get_strategy(system_profile, goal, model_analysis)
		
		# 3. Autotune with TUI updates
		tui.update_progress()
		best_config, best_model, best_result = None, None, None
		try:
			from core.autotuner import autotune_generator
			gen = autotune_generator(model, system_profile, goal, blacklist=blacklist)
			while True:
				try:
					update = next(gen)
					status = update.get("status")
					
					if status == "evaluating":
						tui.start_candidate(update["candidate"])
					elif status == "candidate_complete":
						tui.complete_candidate(update["candidate"])
					elif status == "candidate_failed":
						tui.fail_candidate(update["candidate"], update["error"])
						if server_url:
							report_blacklist(server_url, update["candidate"], update["error"])
					elif status == "complete":
						best_config = update["best_config"]
						best_result = update["best_result"]
				except StopIteration as e:
					best_config, best_model, best_result = e.value
					break
		except Exception as exc:
			logger.error(f"Autotune failed: {exc}")
			raise

		prompt_result = None
		if args.optimize_prompt:
			if not args.prompt_text.strip():
				raise ValueError("--prompt-text is required when --optimize-prompt is enabled")
			prompt_result = optimize_prompt(args.prompt_text, args.prompt_type)

		report = build_report(
			model_path=args.model_path,
			goal=goal,
			system_profile=system_profile,
			model_analysis=model_analysis,
			baseline=baseline,
			strategy=strategy,
			best_config=best_config,
			best_result=best_result,
			model_hash=model_hash,
			prompt_result=prompt_result,
		)

		# 4. Save to cache for future runs
		save_strategy_to_cache(model_hash, goal, system_profile, report)
		
		# 5. Final report to server if approved
		if server_url:
			report_telemetry(server_url, report)
		
		return report


def main(argv: list[str] | None = None) -> int:
	try:
		args = parse_args(argv or sys.argv[1:])
	except SystemExit as exc:
		return int(exc.code) if isinstance(exc.code, int) else 2

	try:
		report = run_pipeline(args)
	except (ValidationError, FileNotFoundError, RuntimeError, ValueError) as exc:
		logger.error(str(exc))
		if getattr(args, "json", False):
			print(json.dumps({"status": "error", "message": str(exc), "code": 500}))
		return 2

	if args.json:
		print(json.dumps(report, indent=2, default=str))
	else:
		print_human_report(report)
		
	if args.export_deploy:
		deploy_path = export_deployment_artifacts(report)
		logger.info(f"Deployment artifacts generated at: {deploy_path}")
		if not args.json:
			from rich.panel import Panel
			from core.tui import console
			console.print(Panel(f"[bold green]✓ Deployment Artifacts Exported[/]\\nLocation: [cyan]{deploy_path}[/]", title="Export-to-Deploy", border_style="green"))

	if args.simulate:
		sim_report = simulate_performance(report, args.simulate)
		if sim_report and not args.json:
			from rich.table import Table
			from rich.panel import Panel
			from core.tui import console
			
			table = Table(title=f"[bold yellow]Virtual Simulation: {sim_report['target_hardware']}[/]", box=box.ROUNDED)
			table.add_column("Metric", style="dim")
			table.add_column("Predicted Value", justify="right", style="bold yellow")
			
			if sim_report["is_oom_predicted"]:
				table.add_row("Status", "[bold red]OUT OF MEMORY PREDICTED[/]")
			else:
				table.add_row("Status", "[bold green]Compatible[/]")
				
			l_min, l_max = sim_report["simulated_latency_range_ms"]
			table.add_row("Simulated Latency", f"{l_max:.2f}ms")
			
			if sim_report["simulated_tokens_per_sec"]:
				table.add_row("Simulated Throughput", f"{sim_report['simulated_tokens_per_sec']:.2f} t/s")
			
			if sim_report["simulated_ttft_ms"]:
				table.add_row("Simulated TTFT", f"{sim_report['simulated_ttft_ms']:.2f} ms")
				
			table.add_row("Compute Gain", f"{sim_report['ratios']['compute_gain']:.2fx}")
			table.add_row("Bandwidth Gain", f"{sim_report['ratios']['bandwidth_gain']:.2fx}")
			
			console.print(table)

	return 0


if __name__ == "__main__":
	raise SystemExit(main())
