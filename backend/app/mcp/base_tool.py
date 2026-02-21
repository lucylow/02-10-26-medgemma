"""
MCP-style base tool. All clinical tools implement execute(context) -> dict.
ToolMetadata for versioning, health, and structured telemetry (PAGE 3).
"""
from abc import ABC, abstractmethod
from typing import Any, Dict

from pydantic import BaseModel, Field


class ToolMetadata(BaseModel):
    """Structured telemetry for MCP tool execution."""
    tool_name: str = Field(..., description="Registered tool name")
    version: str = Field(default="1.0.0", description="Tool version")
    execution_time_ms: int = Field(..., ge=0)
    input_hash: str = Field(default="", description="Hash of input for idempotency/trace")


class MCPTool(ABC):
    """Base for MCP tools. name must be set; execute(context) returns result dict."""

    name: str = "base"
    version: str = "1.0.0"

    @abstractmethod
    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError
