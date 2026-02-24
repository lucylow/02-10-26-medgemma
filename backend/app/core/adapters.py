"""
HAI-DEF adapter registry: production adapters with HuggingFace repo and config.
Ensemble uses pediscreen-v1 (ASQ-3 specialist), base-medgemma, and optional domain specialists.
"""
from typing import Dict, Any

ADAPTER_REGISTRY: Dict[str, Dict[str, Any]] = {
    "pediscreen-v1": {
        "hf_repo": "google/medgemma-2b-it",  # or fine-tuned pediscreen adapter
        "description": "ASQ-3 specialist",
        "priority": 1,
    },
    "base-medgemma": {
        "hf_repo": "google/medgemma-2b-it",
        "description": "Generalist base",
        "priority": 2,
    },
    "domain-specialist": {
        "hf_repo": "google/medgemma-2b-it",
        "description": "Domain-focused (communication/motor)",
        "priority": 3,
    },
    # Optional specialists (load when available)
    "rop-detector-v1": {
        "hf_repo": "google/medgemma-2b-it",
        "description": "Retinopathy specialist",
        "priority": 4,
    },
    "growth-faltering-v1": {
        "hf_repo": "google/medgemma-2b-it",
        "description": "WHO Z-score specialist",
        "priority": 5,
    },
}
