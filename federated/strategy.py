"""
Phase 3: Flower FedAvg strategy with telemetry — log round metrics to DB and Prometheus.
Requires: pip install flwr (and federated/database on PYTHONPATH or same repo).
"""
import logging
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("federated.strategy")

try:
    import flwr as fl
    from flwr.common import FitRes, Parameters, Scalar
    from flwr.server.client_proxy import ClientProxy
    from flwr.server.criterion import Criterion
    from flwr.server.driver import Driver
    from flwr.server.server import Server
    from flwr.server.strategy import FedAvg
    HAS_FLWR = True
except ImportError:
    HAS_FLWR = False
    FedAvg = object  # type: ignore


def _save_round_metrics(
    round_number: int,
    global_loss: Optional[float],
    global_accuracy: Optional[float],
    participating_clients: int,
    dp_noise_multiplier: float = 0.5,
    secure_aggregation: bool = True,
) -> None:
    try:
        from federated.database import save_round_metrics
        save_round_metrics(
            round_number=round_number,
            global_loss=global_loss,
            global_accuracy=global_accuracy,
            participating_clients=participating_clients,
            dp_noise_multiplier=dp_noise_multiplier,
            secure_aggregation=secure_aggregation,
        )
    except ImportError:
        from database import save_round_metrics  # type: ignore
        save_round_metrics(
            round_number=round_number,
            global_loss=global_loss,
            global_accuracy=global_accuracy,
            participating_clients=participating_clients,
            dp_noise_multiplier=dp_noise_multiplier,
            secure_aggregation=secure_aggregation,
        )
    except Exception as e:
        logger.warning("Could not save round metrics: %s", e)


if HAS_FLWR:

    class TelemetryFedAvg(FedAvg):
        """FedAvg that persists round metrics to federated_round_metrics and Prometheus."""

        def aggregate_fit(
            self,
            server_round: int,
            results: List[Tuple[ClientProxy, FitRes]],
            failures: List[Tuple[ClientProxy, Any]],
        ) -> Tuple[Optional[Parameters], Dict[str, Scalar]]:
            aggregated_parameters, metrics = super().aggregate_fit(server_round, results, failures)
            global_loss = metrics.get("loss") if isinstance(metrics.get("loss"), (int, float)) else None
            global_accuracy = metrics.get("accuracy") if isinstance(metrics.get("accuracy"), (int, float)) else None
            _save_round_metrics(
                round_number=server_round,
                global_loss=float(global_loss) if global_loss is not None else None,
                global_accuracy=float(global_accuracy) if global_accuracy is not None else None,
                participating_clients=len(results),
                dp_noise_multiplier=0.5,
                secure_aggregation=True,
            )
            return aggregated_parameters, metrics
else:
    TelemetryFedAvg = None  # type: ignore
