"""
Quick test for walking milestone model.

Tests on synthetic 18mo data. Run after train_walking_milestones.py.
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

# Add project root for imports
PROJECT_ROOT = Path(__file__).resolve().parents[1]  # training/ -> project root
sys.path.insert(0, str(PROJECT_ROOT))


def main():
    from training.train_walking_milestones import predict_walking_age, train_model

    # Test on synthetic 18mo data
    test_data = pd.DataFrame(
        {
            "age_months": [18] * 100,
            "weight_z": np.random.normal(0, 1, 100),
            "length_z": np.random.normal(0, 1, 100),
            "headcirc_z": np.random.normal(0, 1, 100),
            "rolls_over": np.ones(100),  # Typically achieved by 18mo
            "sits_no_support": np.ones(100),  # Typically achieved by 18mo
            "stands_support": np.random.choice([0, 1], 100, p=[0.3, 0.7]),
        }
    )

    model_path = PROJECT_ROOT / "training" / "walking_milestone_model_complete.pth"

    if not model_path.exists():
        print("Model not found. Running training first...")
        train_model()

    predictions = predict_walking_age(str(model_path), test_data)
    print(f"18mo Walking Prediction (mean probability): {predictions.mean():.2%}")


if __name__ == "__main__":
    main()
