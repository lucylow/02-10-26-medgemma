# Canonical MedGemma client: one way to call MedGemma (local HF, Vertex, or mock).
from medgemma_client.schemas import ScreeningRequest, ScreeningResponse
from medgemma_client.local_client import LocalMedGemmaClient
from medgemma_client.vertex_client import VertexMedGemmaClient
from medgemma_client.mock_client import MockMedGemmaClient

def get_client(backend=None):
    backend = backend or __import__("os").environ.get("MEDGEMMA_BACKEND", "mock")
    if backend == "vertex":
        return VertexMedGemmaClient()
    if backend == "local":
        return LocalMedGemmaClient()
    return MockMedGemmaClient()

__all__ = ["get_client", "ScreeningRequest", "ScreeningResponse", "LocalMedGemmaClient", "VertexMedGemmaClient", "MockMedGemmaClient"]
