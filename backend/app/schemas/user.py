"""User and role schemas for role-based access control."""

from typing import Literal

UserRole = Literal["chw", "clinician", "admin"]
ReportStatus = Literal["draft", "pending_review", "finalized"]
