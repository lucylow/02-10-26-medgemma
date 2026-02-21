"""
MCP-style base tool. All clinical tools implement execute(context) -> dict.
ToolMetadata for versioning, health, and structured telemetry (PAGE 3).
"""
import time
from abc import ABC, abstractmethod
from typing import Any, Dict

from pydantic import BaseModel, Field


class ToolMetadata(BaseModel):
    """Structured telemetry for MCP tool execution."""
    tool_name: str = Field(..., description="Registered tool name")
    version: str = Field(default="1.0.0", description="Tool version")
    execution_time_ms: int = Field(..., ge=0)
    input_hash: str = Field(default="", description="Hash of input for idempotency/trace")


def validate_tool_context(context: Dict[str, Any]) -> None:
    """Validate context for tool execution. Raise ValueError if invalid."""
    if not isinstance(context, dict):
        raise ValueError("Context must be a dict")


class MCPTool(ABC):
    """Base for MCP tools. name must be set; execute(context) returns result dict."""

    name: str = "base"
    version: str = "1.0.0"

    def validate_input(self, context: Dict[str, Any]) -> None:
        """Override to add tool-specific validation. Default: context must be dict."""
        validate_tool_context(context)

    @abstractmethod
    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Validate, time, and execute. Use this from registry for timing/validation."""
        self.validate_input(context)
        start = time.perf_counter()
        result = self.execute(context)
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        if isinstance(result, dict) and "execution_time_ms" not in result:
            result = {**result, "execution_time_ms": elapsed_ms}
        return result
