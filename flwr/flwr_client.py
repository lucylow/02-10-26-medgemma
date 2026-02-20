# flwr/flwr_client.py
"""
Flower federated learning client — toy classifier with Prometheus instrumentation.
Replace load_local_data() with MedSigLIP embedding loader for production.
"""
import os
import logging

import numpy as np
import flwr as fl
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
import torch
import torch.nn as nn
import torch.optim as optim
from prometheus_client import start_http_server, Gauge

SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    import sentry_sdk
    sentry_sdk.init(dsn=SENTRY_DSN, traces_sample_rate=0.05)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger("flwr_client")

PROM_PORT = int(os.getenv("PROM_PORT", "8001"))
start_http_server(PROM_PORT)

CLIENT_ID = os.getenv("CLIENT_ID", "client_1")
CLIENT_EXAMPLES = Gauge("fl_client_examples_total", "Examples processed", ["client_id"])
CLIENT_LOSS = Gauge("fl_client_loss", "Latest loss", ["client_id"])
CLIENT_ACC = Gauge("fl_client_accuracy", "Latest accuracy", ["client_id"])


class Net(nn.Module):
    def __init__(self, n_in=20):
        super().__init__()
        self.fc = nn.Sequential(nn.Linear(n_in, 32), nn.ReLU(), nn.Linear(32, 2))

    def forward(self, x):
        return self.fc(x)


def load_local_data(seed=0, n_samples=200):
    """Generate toy data. Replace with MedSigLIP embedding loader for production."""
    X, y = make_classification(n_samples=n_samples, n_features=20, n_informative=8, random_state=seed)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=seed)
    return (X_train.astype(np.float32), y_train.astype(np.int64)), (X_test.astype(np.float32), y_test.astype(np.int64))


def train(net, X, y, epochs=1, lr=0.01):
    net.train()
    opt = optim.Adam(net.parameters(), lr=lr)
    loss_fn = nn.CrossEntropyLoss()
    for _ in range(epochs):
        opt.zero_grad()
        loss = loss_fn(net(torch.from_numpy(X)), torch.from_numpy(y))
        loss.backward()
        opt.step()
    return float(loss.item())


def test(net, X, y):
    net.eval()
    with torch.no_grad():
        pred = net(torch.from_numpy(X)).argmax(dim=1).numpy()
    return float((pred == y).mean())


class FLClient(fl.client.NumPyClient):
    def __init__(self, cid):
        self.cid = cid
        seed = int(cid.split("_")[-1]) if "_" in cid else 0
        (self.X_train, self.y_train), (self.X_test, self.y_test) = load_local_data(seed=seed)
        self.model = Net(n_in=self.X_train.shape[1])

    def get_parameters(self, config=None):
        return [v.cpu().numpy() for v in self.model.state_dict().values()]

    def set_parameters(self, parameters):
        state_dict = {k: torch.tensor(v) for k, v in zip(self.model.state_dict().keys(), parameters)}
        self.model.load_state_dict(state_dict)

    def fit(self, parameters, config):
        self.set_parameters(parameters)
        loss = train(self.model, self.X_train, self.y_train, epochs=int(config.get("epochs", 1)))
        acc = test(self.model, self.X_test, self.y_test)
        CLIENT_EXAMPLES.labels(client_id=self.cid).set(len(self.X_train))
        CLIENT_LOSS.labels(client_id=self.cid).set(loss)
        CLIENT_ACC.labels(client_id=self.cid).set(acc)
        return self.get_parameters(), len(self.X_train), {"loss": loss, "accuracy": acc, "num_examples": len(self.X_train)}

    def evaluate(self, parameters, config):
        self.set_parameters(parameters)
        acc = test(self.model, self.X_test, self.y_test)
        return 0.0, len(self.X_test), {"accuracy": acc}


if __name__ == "__main__":
    server_addr = os.getenv("SERVER_ADDR", "flwr-server:8080")
    logger.info("Starting Flower client %s → %s", CLIENT_ID, server_addr)
    fl.client.start_numpy_client(server_address=server_addr, client=FLClient(CLIENT_ID))
