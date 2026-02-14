"""
PediScreen CLI — modular entrypoints for inference, monitoring, validation, workflow.
Usage: pedi infer ... | pedi monitor status | pedi validate run-suite | pedi workflow sync
"""
import asyncio
import json
import os
import sys
from pathlib import Path

# Ensure project root is on path
_root = Path(__file__).parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))
_backend = _root / "backend"
if _backend.is_dir() and str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

try:
    import typer
except ImportError:
    print("Install typer: pip install typer", file=sys.stderr)
    sys.exit(1)

app = typer.Typer(
    name="pedi",
    help="PediScreen AI — inference, monitoring, validation, workflow",
)


@app.command()
def infer(
    case_id: str = typer.Option(..., "--case-id", "-c", help="Case identifier"),
    age_months: int = typer.Option(..., "--age", "-a", help="Child age in months"),
    observations: str = typer.Option("", "--observations", "-o", help="Caregiver observations"),
    embedding_b64: str = typer.Option(
        "",
        "--embedding",
        "-e",
        help="Base64-encoded float32 embedding (or path to file)",
    ),
    shape: str = typer.Option("[1,256]", "--shape", help="Embedding shape as JSON"),
):
    """Run inference with precomputed embedding."""
    if not embedding_b64:
        typer.echo("Error: --embedding required. Use a base64 string or path to file.", err=True)
        raise typer.Exit(1)
    if os.path.isfile(embedding_b64):
        with open(embedding_b64, "r") as f:
            embedding_b64 = f.read().strip()
    try:
        shape_list = json.loads(shape)
    except json.JSONDecodeError:
        typer.echo("Error: --shape must be valid JSON, e.g. [1,256]", err=True)
        raise typer.Exit(1)

    async def _run():
        from pedi_screen.medgemma_core.inference_engine import InferenceEngine
        engine = InferenceEngine()
        result = await engine.infer(
            case_id=case_id,
            age_months=age_months,
            observations=observations,
            embedding_b64=embedding_b64,
            shape=shape_list,
        )
        typer.echo(json.dumps(result, indent=2))

    asyncio.run(_run())


monitor_app = typer.Typer(help="Monitoring commands")


@monitor_app.command("status")
def monitor_status():
    """Show monitoring status and aggregated metrics."""
    from pedi_screen.monitoring import get_aggregated_metrics
    metrics = get_aggregated_metrics()
    typer.echo(json.dumps(metrics, indent=2))


@monitor_app.command("alerts")
def monitor_alerts(
    config: str = typer.Option("", "--config", "-c", help="Path to alerts.json"),
):
    """Check alert thresholds. Exits 1 if any alerts triggered."""
    from pedi_screen.monitoring import check_alerts
    cfg = config or None
    triggered = check_alerts(config_path=cfg)
    typer.echo(json.dumps(triggered, indent=2))
    if triggered:
        raise typer.Exit(1)


app.add_typer(monitor_app, name="monitor")


validate_app = typer.Typer(help="Validation commands")


@validate_app.command("run-suite")
def validate_run_suite(
    output_dir: str = typer.Option(
        "./validation_reports",
        "--output",
        "-o",
        help="Output directory for reports",
    ),
    test_data: str = typer.Option("", "--test-data", "-d", help="Path to labelled test set"),
):
    """Run validation suite: benchmark + bias audit. Outputs JSON and CSV."""
    from pedi_screen.validation import run_validation_suite
    data_path = test_data or None
    results = run_validation_suite(
        test_data_path=data_path,
        output_dir=output_dir,
    )
    typer.echo(json.dumps(results, indent=2))
    typer.echo(f"\nReports written to {output_dir}/")


app.add_typer(validate_app, name="validate")


workflow_app = typer.Typer(help="Workflow commands")


@workflow_app.command("sync")
def workflow_sync():
    """Sync with EHR (stub)."""
    typer.echo("EHR sync: stub — implement with FHIR connector in production.")


app.add_typer(workflow_app, name="workflow")


def main():
    app()


if __name__ == "__main__":
    main()
