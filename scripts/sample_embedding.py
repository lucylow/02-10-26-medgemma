#!/usr/bin/env python
"""
Create a dummy base64 float32 embedding for demo/testing.
Output: tests/fixtures/sample_emb.b64
"""
import base64
import os
import sys

import numpy as np

# Add project root
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_PATH = os.path.join(ROOT, "tests", "fixtures", "sample_emb.b64")


def main():
    arr = np.random.rand(1, 256).astype("float32")
    b64 = base64.b64encode(arr.tobytes()).decode()
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w") as f:
        f.write(b64)
    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
