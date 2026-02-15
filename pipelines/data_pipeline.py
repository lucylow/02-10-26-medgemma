"""
PediScreen AI - Data Pipeline (Dagster)

Orchestrates download of public datasets and generation of synthetic screenings.
"""
from pathlib import Path

import pandas as pd
from dagster import Definitions, asset, job

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parents[1]


@asset
def cdc_milestones() -> pd.DataFrame:
    """Download and parse CDC milestones."""
    import sys

    sys.path.insert(0, str(PROJECT_ROOT))
    from data.download_public import PublicDatasetDownloader

    downloader = PublicDatasetDownloader()
    return downloader.download_cdc_milestones()


@asset
def mchat_data() -> pd.DataFrame:
    """M-CHAT autism screening data."""
    import sys

    sys.path.insert(0, str(PROJECT_ROOT))
    from data.download_public import PublicDatasetDownloader

    downloader = PublicDatasetDownloader()
    return downloader.download_mchat()


@asset
def synthetic_dataset(cdc_milestones: pd.DataFrame) -> pd.DataFrame:
    """Generate 10K synthetic screenings."""
    import sys

    sys.path.insert(0, str(PROJECT_ROOT))
    from src.data.synthetic_generator import SyntheticDataGenerator

    generator = SyntheticDataGenerator(cdc_milestones_df=cdc_milestones)
    records = generator.generate_batch(10000)
    return pd.DataFrame([r.model_dump() for r in records])


@job
def pediscreen_data_pipeline():
    """Full data pipeline: CDC + M-CHAT -> synthetic dataset."""
    synthetic_dataset(cdc_milestones())


defs = Definitions(
    assets=[cdc_milestones, mchat_data, synthetic_dataset],
    jobs=[pediscreen_data_pipeline],
)
