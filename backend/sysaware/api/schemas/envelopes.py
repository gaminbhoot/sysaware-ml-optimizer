from pydantic import BaseModel
from typing import Generic, TypeVar, Any

T = TypeVar("T")

class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, Any] | list[Any] | None = None

class JSONResponseEnvelope(BaseModel, Generic[T]):
    ok: bool
    data: T | None = None
    error: ErrorDetail | None = None

class SSEEventEnvelope(BaseModel):
    status: str  # "starting" | "progress" | "complete" | "error"
    step: str | None = None
    message: str | None = None
    data: dict[str, Any] | list[Any] | None = None
    error: ErrorDetail | None = None
