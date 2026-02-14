"""Tests for circuit breaker behavior in MedGemmaService."""
import os

import pytest

os.environ.setdefault("REAL_MODE", "false")
os.environ.setdefault("FALLBACK_ON_ERROR", "true")

from backend.medgemma_service import CircuitBreaker, FAILURE_THRESHOLD


def test_circuit_breaker_opens_after_threshold():
    """Circuit opens after FAILURE_THRESHOLD consecutive failures."""
    cb = CircuitBreaker()
    assert not cb.is_open()
    for _ in range(FAILURE_THRESHOLD):
        cb.record_failure()
    assert cb.is_open()


def test_circuit_breaker_resets_on_success():
    """Circuit resets when success is recorded."""
    cb = CircuitBreaker()
    for _ in range(FAILURE_THRESHOLD):
        cb.record_failure()
    assert cb.is_open()
    cb.record_success()
    assert not cb.is_open()
