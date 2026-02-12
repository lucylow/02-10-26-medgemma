"""Report template schemas — locked sections, structured output, persona."""

from pydantic import BaseModel
from typing import List, Literal


LockedSection = Literal[
    "disclaimer",
    "intended_use",
    "limitations",
    "regulatory_status"
]


class ReportSection(BaseModel):
    id: str
    title: str
    content: str
    locked: bool = False


class GeneratedReport(BaseModel):
    sections: List[ReportSection]
    version: str = "draft"


Persona = Literal["clinical", "regulatory", "vc", "technical"]


class ReportRevision(BaseModel):
    report_id: str
    ai_version: str
    human_version: str
    edited_by: str
