"""
Patient state — screening state, longitudinal context.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional


@dataclass
class PatientState:
    """Patient screening state for clinical workflow."""

    patient_id: str
    case_id: Optional[str] = None
    age_months: Optional[int] = None
    last_screening_id: Optional[str] = None
    risk_history: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def add_screening(self, screening_id: str, risk: str) -> None:
        """Record a screening result."""
        self.last_screening_id = screening_id
        self.risk_history.append(risk)
