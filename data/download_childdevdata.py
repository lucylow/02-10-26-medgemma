"""
PediScreen AI - Child Development Data Downloader

Downloads childdevdata from D-score/childdevdata for walking milestone training.
The childdevdata package is an R package; this script clones the repo and
optionally processes data. For Python-only workflows, use synthetic data from
train_walking_milestones.py.
"""
import subprocess
from pathlib import Path

import pandas as pd

DATA_DIR = Path(__file__).resolve().parent
EXTERNAL_DIR = DATA_DIR / "external"
CHILDDEVDATA_DIR = EXTERNAL_DIR / "childdevdata"


def download_real_childdevdata() -> bool:
    """Clone childdevdata repo. Returns True if successful."""
    EXTERNAL_DIR.mkdir(parents=True, exist_ok=True)
    if CHILDDEVDATA_DIR.exists():
        print(f"childdevdata already exists at {CHILDDEVDATA_DIR}")
        return True
    try:
        subprocess.run(
            [
                "git",
                "clone",
                "https://github.com/D-score/childdevdata.git",
                str(CHILDDEVDATA_DIR),
            ],
            check=True,
            capture_output=True,
        )
        print(f"Cloned childdevdata -> {CHILDDEVDATA_DIR}")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        print(f"Git clone failed ({e}). Use synthetic data from train_walking_milestones.py")
        return False


def process_walking_subset() -> pd.DataFrame | None:
    """
    Process walking milestone subset from childdevdata.

    Note: childdevdata is an R package with .rda files. Full extraction
    requires R. This provides a placeholder; for production, use R to export
    to CSV/parquet or use the synthetic data generator in train_walking_milestones.py.
    """
    # Check for pre-exported walking data (if user ran R script)
    walking_path = CHILDDEVDATA_DIR / "data" / "walking_longitudinal.csv"
    if walking_path.exists():
        df = pd.read_csv(walking_path)
        out_path = EXTERNAL_DIR / "childdevdata_walking.parquet"
        df.to_parquet(out_path, index=False)
        print(f"Processed walking data -> {out_path}")
        return df

    # R package data lives in data/*.rda - would need R to extract
    print(
        "childdevdata uses R .rda format. For Python training, use synthetic data "
        "from train_walking_milestones.load_childdevdata()"
    )
    return None


def run_all() -> dict:
    """Download and optionally process childdevdata."""
    ok = download_real_childdevdata()
    result = {"downloaded": ok}
    if ok:
        df = process_walking_subset()
        result["walking_df"] = df
    return result


if __name__ == "__main__":
    run_all()
