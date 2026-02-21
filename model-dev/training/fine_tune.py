#!/usr/bin/env python3
"""
Multimodal (MedSigLIP + text) fine-tuning loop for PediScreen AI.

Supports:
- Vision + text fusion model (see models/multimodal_model.MultimodalPediModel)
- Optional differential privacy via Opacus (noise_multiplier, max_grad_norm)

Usage (from repo root):
  python model-dev/training/fine_tune.py --data_dir ./data/multimodal --epochs 5
  python model-dev/training/fine_tune.py --data_dir ./data/multimodal --use_dp --noise_multiplier 1.0
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import torch
import torch.nn as nn

# Optional: Opacus for differential privacy
try:
    from opacus import PrivacyEngine
except ImportError:
    PrivacyEngine = None


def fine_tune(
    model: nn.Module,
    dataloader: torch.utils.data.DataLoader,
    *,
    epochs: int = 5,
    lr: float = 2e-5,
    device: torch.device | None = None,
    use_dp: bool = False,
    noise_multiplier: float = 1.0,
    max_grad_norm: float = 1.0,
    num_classes: int = 1,
) -> nn.Module:
    """
    Fine-tune a multimodal (or fusion) model on (images, text, labels).
    dataloader yields (images, text_input, labels) where labels are float (binary) or long (multi-class).
    """
    if device is None:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = model.to(device)

    optimizer = torch.optim.AdamW(model.parameters(), lr=lr)
    criterion = nn.BCELoss() if num_classes == 1 else nn.CrossEntropyLoss()

    if use_dp and PrivacyEngine is not None:
        privacy_engine = PrivacyEngine()
        model, optimizer, dataloader = privacy_engine.make_private(
            module=model,
            optimizer=optimizer,
            data_loader=dataloader,
            noise_multiplier=noise_multiplier,
            max_grad_norm=max_grad_norm,
        )

    model.train()
    for epoch in range(epochs):
        total_loss = 0.0
        n_batches = 0
        for batch in dataloader:
            images, text, labels = batch[0].to(device), batch[1], batch[2]
            if isinstance(text, (list, tuple)):
                text = [t.to(device) if isinstance(t, torch.Tensor) else t for t in text]
            elif isinstance(text, dict):
                text = {k: v.to(device) if isinstance(v, torch.Tensor) else v for k, v in text.items()}
            else:
                text = text.to(device)
            labels = labels.to(device)

            if num_classes == 1:
                labels = labels.float().unsqueeze(1)

            logits = model(images, text)
            if num_classes == 1:
                preds = torch.sigmoid(logits)
            else:
                preds = logits

            if num_classes == 1:
                loss = criterion(preds, labels)
            else:
                loss = criterion(preds, labels.long())

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            total_loss += loss.item()
            n_batches += 1

        avg_loss = total_loss / max(n_batches, 1)
        print(f"Epoch {epoch}: Loss={total_loss:.4f} (avg={avg_loss:.4f})")

    return model


def get_dp_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Multimodal fine-tuning with optional DP")
    parser.add_argument("--data_dir", type=str, default="./data/multimodal", help="Dataset root")
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--lr", type=float, default=2e-5)
    parser.add_argument("--batch_size", type=int, default=8)
    parser.add_argument("--use_dp", action="store_true", help="Enable Opacus differential privacy")
    parser.add_argument("--noise_multiplier", type=float, default=1.0)
    parser.add_argument("--max_grad_norm", type=float, default=1.0)
    return parser


if __name__ == "__main__":
    parser = get_dp_parser()
    args = parser.parse_args()

    # Stub: user must provide model + dataloader (e.g. from radiology_processor or custom Dataset)
    # Example with MultimodalPediModel:
    #
    # from models.multimodal_model import MultimodalPediModel
    # from torch.utils.data import DataLoader
    # model = MultimodalPediModel(vision_model, text_model, embed_dim=768)
    # dl = DataLoader(dataset, batch_size=args.batch_size, shuffle=True, num_workers=0)
    # fine_tune(model, dl, epochs=args.epochs, lr=args.lr, use_dp=args.use_dp,
    #           noise_multiplier=args.noise_multiplier, max_grad_norm=args.max_grad_norm)

    print("fine_tune.py: provide model and DataLoader in script or use fine_tune() from your training script.")
    print("DP option: --use_dp (requires opacus).")
    print("Example: from model_dev.training.fine_tune import fine_tune")
