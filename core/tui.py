from rich.console import Console
from rich.layout import Layout
from rich.panel import Panel
from rich.live import Live
from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn, TimeElapsedColumn
from rich.table import Table
from rich.text import Text
from rich import box
from datetime import datetime
import platform

console = Console()

class SysAwareTUI:
    def __init__(self, goal: str, model_path: str):
        self.goal = goal
        self.model_path = model_path
        self.layout = Layout()
        self.progress = Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(bar_width=None),
            TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
            TimeElapsedColumn(),
        )
        self.tasks = {}
        self._init_layout()

    def _init_layout(self):
        self.layout.split(
            Layout(name="header", size=3),
            Layout(name="body"),
            Layout(name="footer", size=3),
        )
        self.layout["body"].split_row(
            Layout(name="main", ratio=2),
            Layout(name="side", ratio=1),
        )
        self.layout["main"].split_column(
            Layout(name="progress_panel"),
            Layout(name="logs", size=10),
        )

    def update_header(self, machine_id: str):
        grid = Table.grid(expand=True)
        grid.add_column(justify="left", ratio=1)
        grid.add_column(justify="right", ratio=1)
        grid.add_row(
            Text(f" 🚀 SysAware ML Optimizer | Goal: {self.goal.upper()}", style="bold magenta"),
            Text(f"Node: {machine_id} | {datetime.now().strftime('%H:%M:%S')} ", style="dim white")
        )
        self.layout["header"].update(Panel(grid, style="white on black", box=box.HORIZONTALS))

    def update_system_panel(self, profile: dict):
        table = Table(show_header=False, box=box.SIMPLE, expand=True)
        table.add_row("OS", f"[white]{profile.get('os', 'Unknown')}[/]")
        table.add_row("CPU", f"[white]{profile.get('cpu_cores', '—')} Cores[/]")
        table.add_row("RAM", f"[white]{profile.get('ram_gb', 0):.1f} GB[/]")
        
        gpu_name = profile.get('dgpu_name') or profile.get('igpu_name') or "None"
        table.add_row("GPU", f"[cyan]{gpu_name}[/]")
        
        self.layout["side"].update(Panel(table, title="[bold cyan]Hardware Profile[/]", border_style="cyan"))

    def update_progress(self):
        self.layout["progress_panel"].update(Panel(self.progress, title="[bold green]Autotuning Engine[/]", border_style="green"))

    def add_log(self, message: str, style: str = "white"):
        # In a real TUI we'd use a collections.deque for logs, but for simplicity:
        pass

    def start_candidate(self, name: str):
        if name not in self.tasks:
            self.tasks[name] = self.progress.add_task(f"Evaluating {name}...", total=100)

    def complete_candidate(self, name: str):
        if name in self.tasks:
            self.progress.update(self.tasks[name], completed=100, description=f"[bold green]✓ {name} Complete[/]")

    def fail_candidate(self, name: str, error: str):
        if name in self.tasks:
            self.progress.update(self.tasks[name], description=f"[bold red]✗ {name} Failed[/]")

def render_final_table(report: dict):
    system = report["system_profile"]
    best_result = report["best_result"]
    best_config = report["best_config"]
    baseline = report["baseline"]

    table = Table(title="[bold magenta]Final Optimization Report[/]", box=box.DOUBLE_EDGE, header_style="bold cyan")
    table.add_column("Metric", style="dim")
    table.add_column("Baseline", justify="right")
    table.add_column("Optimized", justify="right", style="bold green")
    table.add_column("Improvement", justify="right")

    def fmt_lat(lat_range):
        return f"{lat_range[1]:.2f}ms" if lat_range else "—"

    base_lat = baseline.get('latency_range_ms', [0, 0])[1]
    opt_lat = best_result.get('latency_range_ms', [0, 0])[1]
    lat_imp = f"{((base_lat - opt_lat) / base_lat * 100):.1f}%" if base_lat > 0 else "—"

    table.add_row("Latency (P99)", fmt_lat(baseline.get('latency_range_ms')), fmt_lat(best_result.get('latency_range_ms')), lat_imp)
    table.add_row("Memory Use", f"{baseline.get('memory_mb', 0):.0f}MB", f"{best_result.get('memory_mb', 0):.0f}MB", f"{((baseline.get('memory_mb', 0) - best_result.get('memory_mb', 0)) / (baseline.get('memory_mb', 1)) * 100):.1f}%")
    
    if "decode_tokens_per_sec" in best_result:
        table.add_row("Throughput", "—", f"{best_result['decode_tokens_per_sec']:.2f} t/s", "—")

    console.print("\n")
    console.print(table)
    console.print(Panel(f"[bold white]Recommendation:[/] {report['strategy']['recommendation']}", border_style="magenta"))
