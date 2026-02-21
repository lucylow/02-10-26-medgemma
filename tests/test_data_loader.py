"""
Tests for data loaders and schema (Page 3 acceptance).
"""
import json
import tempfile
from pathlib import Path

import pytest

# Allow importing data package from repo root
import sys
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from data.loader import load_jsonl, load_jsonl_list, load_csv, sanity_check
from data.schema import CaseRecord, validate_label, VALID_LABELS
from data.synth import generate_synthetic


def test_case_record_resolved_label():
    r = CaseRecord(case_id="x", age_months=24, observations="test", label="monitor")
    assert r.resolved_label() == "monitor"
    r2 = CaseRecord(case_id="y", age_months=24, observations="test", expected_risk="refer")
    assert r2.resolved_label() == "refer"


def test_validate_label():
    assert validate_label("monitor") is True
    assert validate_label("refer") is True
    assert validate_label("invalid") is False
    assert validate_label(None) is False


def test_load_jsonl(tmp_path):
    path = tmp_path / "test.jsonl"
    path.write_text(
        '{"case_id": "a", "age_months": 24, "observations": "obs1", "label": "monitor"}\n'
        '{"case_id": "b", "age_months": 36, "observations": "obs2", "expected_risk": "on_track"}\n'
    )
    records = load_jsonl_list(path)
    assert len(records) == 2
    assert records[0].case_id == "a" and records[0].resolved_label() == "monitor"
    assert records[1].resolved_label() == "on_track"


def test_load_jsonl_missing_file():
    with pytest.raises(FileNotFoundError):
        load_jsonl_list(Path("/nonexistent/file.jsonl"))


def test_sanity_check():
    records = [
        CaseRecord(case_id="1", age_months=24, observations="a", label="monitor"),
        CaseRecord(case_id="2", age_months=36, observations="b", label="refer"),
    ]
    out = sanity_check(records)
    assert out["count"] == 2
    assert out["valid_labels"] == 2
    assert out["duplicate_case_ids"] == []


def test_sanity_check_duplicates():
    records = [
        CaseRecord(case_id="1", age_months=24, observations="a", label="monitor"),
        CaseRecord(case_id="1", age_months=36, observations="b", label="refer"),
    ]
    out = sanity_check(records)
    assert out["duplicate_case_ids"] == ["1"]


def test_synth_reproducible():
    a = generate_synthetic(10, seed=42)
    b = generate_synthetic(10, seed=42)
    assert len(a) == 10
    assert a[0]["case_id"] == b[0]["case_id"]
    assert a[0]["age_months"] == b[0]["age_months"]
    assert a[0]["label"] in VALID_LABELS


def test_synth_with_embedding():
    recs = generate_synthetic(5, seed=1, include_embedding=True, embedding_dim=64)
    assert len(recs) == 5
    assert "embedding" in recs[0]
    assert len(recs[0]["embedding"]) == 64


def test_load_csv(tmp_path):
    csv_path = tmp_path / "train.csv"
    csv_path.write_text(
        "case_id,age_months,observations,label\n"
        "c1,24,Some obs,monitor\n"
        "c2,36,Other obs,on_track\n"
    )
    records = load_csv(csv_path)
    assert len(records) == 2
    assert records[0].case_id == "c1" and records[0].resolved_label() == "monitor"
