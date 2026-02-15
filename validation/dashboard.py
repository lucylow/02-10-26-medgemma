"""
PediScreen AI - Dataset Explorer Dashboard

Streamlit dashboard for exploring synthetic and public screening data.
"""
from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st

PROJECT_ROOT = Path(__file__).resolve().parents[1]
PUBLIC_DIR = PROJECT_ROOT / "data" / "public"
SYNTHETIC_DIR = PROJECT_ROOT / "data" / "synthetic" / "v1.0"
COMBINED_PATH = PROJECT_ROOT / "data" / "combined.parquet"


def load_data() -> pd.DataFrame:
    """Load combined or synthetic data for dashboard."""
    if COMBINED_PATH.exists():
        return pd.read_parquet(COMBINED_PATH)

    dfs = []
    if (SYNTHETIC_DIR / "train.parquet").exists():
        df_synth = pd.read_parquet(SYNTHETIC_DIR / "train.parquet")
        df_synth["source"] = "synthetic"
        dfs.append(df_synth)

    if (PUBLIC_DIR / "mchat.parquet").exists():
        df_mchat = pd.read_parquet(PUBLIC_DIR / "mchat.parquet")
        # Normalize columns for display
        if "clinician_risk" not in df_mchat.columns and "risk_score" in df_mchat.columns:
            df_mchat["clinician_risk"] = df_mchat["risk_score"].apply(
                lambda x: "refer" if x and float(x) > 2 else "monitor"
            )
        if "domain" not in df_mchat.columns:
            df_mchat["domain"] = "communication"
        df_mchat["source"] = "mchat"
        dfs.append(df_mchat)

    if not dfs:
        st.warning("No data found. Run `make data-download` and `make data-generate-synthetic` first.")
        return pd.DataFrame()

    return pd.concat(dfs, ignore_index=True)


st.set_page_config(page_title="PediScreen AI - Dataset Explorer", layout="wide")
st.title("🍼 PediScreen AI - Dataset Explorer")

df = load_data()

if df.empty:
    st.stop()

# Dataset stats
col1, col2, col3, col4 = st.columns(4)
total = len(df)
synth_count = len(df[df["source"] == "synthetic"]) if "source" in df.columns else total
mchat_count = len(df[df["source"] == "mchat"]) if "source" in df.columns else 0
domains = df["domain"].nunique() if "domain" in df.columns else 0

col1.metric("Total Records", f"{total:,}")
col2.metric("Synthetic", f"{synth_count:,}", f"↑{synth_count - 8000}" if synth_count > 8000 else "")
col3.metric("Public (M-CHAT)", f"{mchat_count:,}")
col4.metric("Coverage", f"{domains} domains ✓")

# Risk distribution
if "clinician_risk" in df.columns and "domain" in df.columns:
    fig = px.histogram(df, x="clinician_risk", color="domain", barmode="group")
    st.plotly_chart(fig, use_container_width=True)

st.subheader("Sample Records")
st.dataframe(df.head(10), use_container_width=True)
