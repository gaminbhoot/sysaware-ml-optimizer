from collections.abc import Mapping
from typing import Any

from .contracts import ModelAnalysis
from .logging_utils import get_logger

try:
	import torch  # type: ignore
except Exception:  # pragma: no cover
	torch = None  # type: ignore


logger = get_logger("sysaware.model_analyzer")


def _tensor_size_mb(tensor: Any) -> float:
	if tensor is None:
		return 0.0
	element_size = getattr(tensor, "element_size", None)
	numel = getattr(tensor, "numel", None)
	if callable(element_size) and callable(numel):
		try:
			return float(element_size()) * float(numel()) / (1024 ** 2)
		except Exception:
			return 0.0
	return 0.0


def _is_tensor_like(value: Any) -> bool:
	if value is None:
		return False
	if torch is not None and isinstance(value, torch.Tensor):
		return True
	return all(hasattr(value, attr) for attr in ("numel", "element_size"))


def _sum_tensor_collection(values: list[Any]) -> tuple[int, float]:
	count = 0
	size_mb = 0.0
	for item in values:
		if _is_tensor_like(item):
			try:
				count += int(item.numel())
			except Exception:
				pass
			size_mb += _tensor_size_mb(item)
	return count, size_mb


def _sum_nested_tensors(value: Any) -> tuple[int, float]:
	if _is_tensor_like(value):
		try:
			return int(value.numel()), _tensor_size_mb(value)
		except Exception:
			return 0, 0.0

	if isinstance(value, Mapping):
		total_params = 0
		size_mb = 0.0
		for nested_value in value.values():
			nested_params, nested_size = _sum_nested_tensors(nested_value)
			total_params += nested_params
			size_mb += nested_size
		return total_params, size_mb

	if isinstance(value, (list, tuple)):
		total_params = 0
		size_mb = 0.0
		for nested_value in value:
			nested_params, nested_size = _sum_nested_tensors(nested_value)
			total_params += nested_params
			size_mb += nested_size
		return total_params, size_mb

	return 0, 0.0


def analyze_model(model: Any) -> ModelAnalysis:
	if model is None:
		raise ValueError("Model cannot be None")

	model_name = model.__class__.__name__
	total_params = 0
	trainable_params = 0
	size_mb = 0.0
	layer_types: dict[str, int] = {}

	if hasattr(model, "parameters"):
		try:
			parameters = list(model.parameters())
		except Exception as exc:
			raise ValueError(f"Unable to read model parameters: {exc}") from exc

		if not parameters:
			logger.warning("Model '%s' has no parameters", model_name)

		for parameter in parameters:
			try:
				total_params += int(parameter.numel())
			except Exception:
				continue
			if getattr(parameter, "requires_grad", False):
				trainable_params += int(parameter.numel())
			size_mb += _tensor_size_mb(parameter)

		try:
			buffers = list(model.buffers()) if hasattr(model, "buffers") else []
		except Exception:
			buffers = []
		_, buffer_size_mb = _sum_tensor_collection(buffers)
		size_mb += buffer_size_mb

		# Track layer types if it's a torch.nn.Module
		if hasattr(model, "modules"):
			try:
				for m in model.modules():
					m_type = m.__class__.__name__
					layer_types[m_type] = layer_types.get(m_type, 0) + 1
			except Exception:
				pass

	elif isinstance(model, Mapping):
		for value in model.values():
			value_params, value_size = _sum_nested_tensors(value)
			total_params += value_params
			size_mb += value_size
		if not total_params:
			logger.warning("Model '%s' mapping contains no tensor-like values", model_name)
	elif isinstance(model, (list, tuple)):
		for value in model:
			value_params, value_size = _sum_nested_tensors(value)
			total_params += value_params
			size_mb += value_size
		if not total_params:
			logger.warning("Model '%s' collection contains no tensor-like values", model_name)
	else:
		raise ValueError(
			"Unsupported model type. Expected a torch.nn.Module."
		)

	analysis: ModelAnalysis = {
		"model_name": model_name,
		"num_params": int(total_params),
		"trainable_params": int(trainable_params),
		"size_mb": float(size_mb),
		"layer_types": layer_types,
	}
	return analysis
