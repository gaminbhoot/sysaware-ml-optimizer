from __future__ import annotations
from typing import Any, Protocol, Dict, List, Tuple
from .logging_utils import get_logger

logger = get_logger("sysaware.plugins")

class OptimizationResult:
    def __init__(self, model: Any, metadata: Dict[str, Any]):
        self.model = model
        self.metadata = metadata

class OptimizationPlugin(Protocol):
    """Protocol for defining new optimization backends."""
    def apply(self, model: Any, profile: Dict[str, Any]) -> tuple[Any, Dict[str, Any]]:
        ...

class PluginRegistry:
    """Registry to manage optimization plugins dynamically."""
    def __init__(self):
        self._plugins: Dict[str, OptimizationPlugin] = {}

    def register(self, name: str, plugin: OptimizationPlugin):
        self._plugins[name.lower()] = plugin
        logger.info(f"Registered optimization plugin: {name}")

    def get(self, name: str) -> OptimizationPlugin | None:
        return self._plugins.get(name.lower())

    def list_supported_modes(self) -> List[str]:
        return list(self._plugins.keys())

# Create a global registry instance
registry = PluginRegistry()
