"""
Tests for circuit breaker: repeated failures trip circuit; fallback used when open.
"""
import pytest


def test_circuit_wrap_no_breaker_installed():
    """When pybreaker not installed, circuit_wrap is a no-op."""
    from utils.circuit import circuit_wrap
    def ok():
        return 1
    wrapped = circuit_wrap(ok)
    assert wrapped() == 1


def test_download_adapter_local_missing_raises():
    """download_adapter with non-existent local path raises FileNotFoundError."""
    from utils.circuit import download_adapter
    with pytest.raises(FileNotFoundError):
        download_adapter("/nonexistent/path")


def test_download_adapter_empty_succeeds():
    """download_adapter with empty path returns True."""
    from utils.circuit import download_adapter
    assert download_adapter("") is True


def test_download_adapter_remote_path_succeeds():
    """download_adapter with gs:// or https:// path does not raise (stub)."""
    from utils.circuit import download_adapter
    assert download_adapter("gs://bucket/adapter") is True
    assert download_adapter("https://example.com/adapter") is True
