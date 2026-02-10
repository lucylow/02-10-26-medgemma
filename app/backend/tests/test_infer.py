"""
Test script for MedGemma inference API
"""

import base64
import numpy as np
import requests
import json
from typing import Tuple

# Server URL
URL = "http://localhost:8000"


def make_fake_embedding(dim: int = 256) -> Tuple[str, list]:
    """Generate a fake embedding for testing"""
    arr = np.random.randn(1, dim).astype("float32")
    b64 = base64.b64encode(arr.tobytes()).decode("ascii")
    return b64, [1, dim]


def test_health():
    """Test health endpoint"""
    print("\n=== Testing /health ===")
    try:
        r = requests.get(f"{URL}/health", timeout=10)
        print(f"Status: {r.status_code}")
        print(f"Response: {json.dumps(r.json(), indent=2)}")
        return r.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False


def test_analyze_text_only():
    """Test analyze endpoint with text only"""
    print("\n=== Testing /analyze (text only) ===")
    
    payload = {
        "case_id": "test-text-001",
        "age_months": 24,
        "domain": "communication",
        "observations": "Child responds to name, says about 20 words, follows simple instructions. Parents concerned about limited vocabulary compared to peers."
    }
    
    try:
        r = requests.post(f"{URL}/analyze", json=payload, timeout=60)
        print(f"Status: {r.status_code}")
        print(f"Response: {json.dumps(r.json(), indent=2)}")
        return r.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False


def test_analyze_with_embedding():
    """Test analyze endpoint with embedding"""
    print("\n=== Testing /analyze (with embedding) ===")
    
    emb_b64, shape = make_fake_embedding()
    
    payload = {
        "case_id": "test-emb-001",
        "age_months": 36,
        "domain": "fine_motor",
        "observations": "Child can stack 6 blocks, attempts to copy circles, holds crayon with fist grip.",
        "embedding_b64": emb_b64,
        "shape": shape
    }
    
    try:
        r = requests.post(f"{URL}/analyze", json=payload, timeout=60)
        print(f"Status: {r.status_code}")
        print(f"Response: {json.dumps(r.json(), indent=2)}")
        return r.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False


def test_api_analyze():
    """Test /api/analyze endpoint (frontend format)"""
    print("\n=== Testing /api/analyze ===")
    
    payload = {
        "case_id": "test-api-001",
        "age_months": 18,
        "domain": "gross_motor",
        "observations": "Child walks independently, climbs stairs with support, can throw a ball overhand."
    }
    
    try:
        r = requests.post(f"{URL}/api/analyze", json=payload, timeout=60)
        print(f"Status: {r.status_code}")
        print(f"Response: {json.dumps(r.json(), indent=2)}")
        return r.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False


def run_all_tests():
    """Run all tests"""
    print("=" * 60)
    print("PediScreen MedGemma API Tests")
    print("=" * 60)
    
    results = {
        "health": test_health(),
        "analyze_text_only": test_analyze_text_only(),
        "analyze_with_embedding": test_analyze_with_embedding(),
        "api_analyze": test_api_analyze(),
    }
    
    print("\n" + "=" * 60)
    print("Test Results:")
    print("=" * 60)
    
    for test_name, passed in results.items():
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"  {test_name}: {status}")
    
    all_passed = all(results.values())
    print("\n" + ("All tests passed!" if all_passed else "Some tests failed."))
    
    return all_passed


if __name__ == "__main__":
    run_all_tests()
