"""Compatibility package exposing backend.core as a top-level package."""

from importlib import import_module
from pathlib import Path
from pkgutil import extend_path

__path__ = extend_path(__path__, __name__)

_backend_core = Path(__file__).resolve().parent.parent / "backend" / "core"
if _backend_core.is_dir():
    __path__.append(str(_backend_core))

_backend_core_module = import_module("backend.core")
__all__ = list(getattr(_backend_core_module, "__all__", ()))

for name in __all__:
    globals()[name] = getattr(_backend_core_module, name)