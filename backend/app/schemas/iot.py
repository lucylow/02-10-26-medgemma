"""
PediScreen AI IoT API Schemas - Pediatric Vital Signs Ingestion.

These schemas define the IoT HTTP/WebSocket contracts for:
- High-frequency vital signs ingestion from pediatric wearables/monitors
- Device registration / heartbeat
- Clinician alert acknowledgement
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
import re

from pydantic import BaseModel, Field, validator


class VitalSignsCreate(BaseModel):
    """IoT sensor data ingestion (high frequency ~1Hz)."""

    device_mac: str = Field(..., description="Bluetooth MAC address")
    patient_age_months: int = Field(
        ..., ge=0, le=144, description="Child age in months (0-144)"
    )

    # Required vitals
    heart_rate_bpm: float = Field(..., ge=0, le=300)
    respiratory_rate: float = Field(..., ge=0, le=100)

    # Optional vitals
    oxygen_saturation: Optional[float] = Field(None, ge=0, le=100)
    body_temperature_c: Optional[float] = Field(None, ge=20, le=45)
    activity_level: Optional[str] = Field(
        None, description="sleep | resting | active | crying | feeding"
    )

    # Device metadata
    battery_level: Optional[float] = Field(None, ge=0, le=100)
    signal_strength_dbm: Optional[float] = Field(
        None, ge=-100, le=0, description="RSSI / signal strength in dBm"
    )
    signal_quality: Optional[float] = Field(
        None, ge=0, le=1, description="0-1.0 quality score from device"
    )

    @validator("device_mac")
    def validate_mac(cls, v: str) -> str:
        """Basic MAC address validation (AA:BB:CC:DD:EE:FF or with dashes)."""
        normalized = v.replace("-", ":")
        if not re.match(r"^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$", normalized):
            raise ValueError("Invalid MAC address format")
        return normalized.lower()


class VitalSignsResponse(BaseModel):
    """Standard response after vitals ingestion."""

    id: str
    device_id: Optional[str] = None
    patient_id: Optional[str] = Field(
        None,
        description="Tokenized patient identifier associated with device, if available",
    )
    patient_age_months: int
    heart_rate_bpm: float
    respiratory_rate: float
    oxygen_saturation: Optional[float]
    body_temperature_c: Optional[float]
    activity_level: Optional[str] = None
    timestamp: datetime
    is_normal: bool = Field(
        ..., description="True when all vitals within age-adjusted pediatric range"
    )
    alerts_triggered: List[str] = Field(
        default_factory=list,
        description="List of alert types triggered (e.g. heart_rate, oxygen_critical)",
    )
    raw: Dict[str, Any] = Field(
        default_factory=dict,
        description="Raw payload stored for audit/debug (non-PHI metadata only)",
    )


class DeviceRegister(BaseModel):
    """Device registration / heartbeat."""

    device_name: str = Field(..., max_length=100)
    device_type: str = Field(
        ...,
        description="wearable | chest_strap | bedside | baby_monitor | other",
    )
    mac_address: str
    firmware_version: str
    patient_id: Optional[str] = Field(
        None,
        description="Tokenized patient identifier; never raw MRN or name.",
    )

    @validator("mac_address")
    def validate_mac(cls, v: str) -> str:
        normalized = v.replace("-", ":")
        if not re.match(r"^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$", normalized):
            raise ValueError("Invalid MAC address format")
        return normalized.lower()


class AlertAcknowledge(BaseModel):
    """Clinician acknowledges alert."""

    clinician_id: str = Field(
        ..., description="Clinician identifier from auth provider / EHR"
    )
    notes: Optional[str] = Field(
        None, max_length=500, description="Optional clinician notes on alert"
    )


class VitalAlertResponse(BaseModel):
    """Response when an alert is acknowledged or fetched."""

    id: str
    device_id: Optional[str] = None
    patient_id: Optional[str] = None
    vital_type: str
    current_value: float
    threshold_min: Optional[float]
    threshold_max: Optional[float]
    severity: str
    duration_seconds: int
    acknowledged: bool
    clinician_notes: Optional[str]
    created_at: datetime
    acknowledged_at: Optional[datetime] = None

