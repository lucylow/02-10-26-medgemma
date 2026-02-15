"""
PediScreen AI - Clinical Validation Dashboard

Streamlit dashboard for validation metrics, safety, and FDA compliance.
"""
from pathlib import Path

import json
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

PROJECT_ROOT = Path(__file__).resolve().parents[2]
REPORTS_DIR = PROJECT_ROOT / "validation" / "reports"
GOLD_PATH = PROJECT_ROOT / "validation" / "datasets" / "gold_holdout.csv"


def load_validation_report() -> dict | None:
    """Load latest validation report JSON."""
    report_path = REPORTS_DIR / "validation_report.json"
    if not report_path.exists():
        return None
    with open(report_path, encoding="utf-8") as f:
        return json.load(f)


def load_gold_holdout() -> pd.DataFrame:
    """Load gold holdout for display."""
    if GOLD_PATH.exists():
        return pd.read_csv(GOLD_PATH)
    parquet_path = PROJECT_ROOT / "validation" / "datasets" / "gold_holdout.parquet"
    if parquet_path.exists():
        return pd.read_parquet(parquet_path)
    return pd.DataFrame()


st.set_page_config(
    page_title="PediScreen AI - Clinical Validation",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.title("🩺 PediScreen AI Clinical Validation")
st.caption("Production-grade validation for regulatory approval and clinician trust")

report = load_validation_report()
df = load_gold_holdout()

if report:
    acc = report.get("accuracy", {})
    safety = report.get("safety", {})
    checklist = report.get("fda_cds_checklist", {})

    # Key metrics
    col1, col2, col3, col4 = st.columns(4)
    sens = acc.get("sensitivity", 0)
    sens_ci = acc.get("sensitivity_ci_95", [0, 0])
    col1.metric(
        "Sensitivity",
        f"{sens:.1%}",
        f"[{sens_ci[0]:.1%}-{sens_ci[1]:.1%}]" if sens_ci else "",
    )
    spec = acc.get("specificity", 0)
    spec_ci = acc.get("specificity_ci_95", [0, 0])
    col2.metric(
        "Specificity",
        f"{spec:.1%}",
        f"[{spec_ci[0]:.1%}-{spec_ci[1]:.1%}]" if spec_ci else "",
    )
    fn_count = safety.get("count", 0)
    fn_rate = safety.get("false_negative_rate", 0)
    col3.metric("False Negatives (Refer)", fn_count, f"Rate: {fn_rate:.1%}")
    compliance = sum(checklist.values()) / max(1, len(checklist)) * 100
    col4.metric("FDA CDS Compliance", f"{compliance:.0f}%", "✓" if report.get("compliance_status") else "⚠")

    # Confusion matrix
    cm = acc.get("confusion_matrix", [])
    if cm:
        st.subheader("Confusion Matrix")
        labels = ["on_track", "monitor", "discuss", "refer"]
        fig = px.imshow(
            cm,
            x=labels,
            y=labels,
            labels=dict(x="Predicted", y="True", color="Count"),
            color_continuous_scale="Blues",
            aspect="auto",
        )
        fig.update_layout(title="Risk Level Confusion Matrix")
        st.plotly_chart(fig, use_container_width=True)

    # FDA checklist
    st.subheader("FDA CDS Checklist")
    for k, v in checklist.items():
        st.checkbox(k.replace("_", " ").title(), value=v, disabled=True)

else:
    st.warning(
        "No validation report found. Run: "
        "`PYTHONPATH=. python validation/benchmarks/run_benchmark.py --mock-predictions`"
    )

# Gold holdout summary
if not df.empty:
    st.subheader("Gold Holdout Summary")
    risk_counts = df["clinician_risk"].value_counts()
    fig = px.bar(
        x=risk_counts.index,
        y=risk_counts.values,
        labels={"x": "Risk Level", "y": "Count"},
        title="Gold Standard Distribution",
    )
    st.plotly_chart(fig, use_container_width=True)
    st.dataframe(df.head(10), use_container_width=True)
