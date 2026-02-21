# telemetry_service/tests/test_psi.py
import pytest
from app.telemetry.psi import calculate_psi


def test_psi_identical_distributions():
    ref = [1.0, 2.0, 3.0, 4.0, 5.0] * 20
    curr = ref[:]
    psi, details = calculate_psi(ref, curr, buckets=5)
    assert psi == pytest.approx(0.0, abs=1e-9)
    assert "buckets" in details
    assert details["psi"] == psi


def test_psi_shifted_distribution():
    ref = [1.0, 2.0, 3.0] * 100
    curr = [2.0, 3.0, 4.0] * 100
    psi, details = calculate_psi(ref, curr, buckets=5)
    assert psi > 0
    assert details["psi"] == psi


def test_psi_empty_reference_raises():
    with pytest.raises(ValueError, match="non-empty"):
        calculate_psi([], [1.0, 2.0], buckets=5)


def test_psi_empty_current_raises():
    with pytest.raises(ValueError, match="non-empty"):
        calculate_psi([1.0, 2.0], [], buckets=5)


def test_psi_buckets_affects_detail_length():
    ref = list(range(100))
    curr = list(range(50, 150))
    _, details = calculate_psi(ref, curr, buckets=10)
    assert len(details["buckets"]) == 10
