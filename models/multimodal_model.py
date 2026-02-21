"""
MedSigLIP + MedGemma Multimodal Fusion Model for PediScreen AI.

Architecture:
  Image Encoder (MedSigLIP or compatible)
  + Text Encoder (MedGemma or compatible)
  + Fusion Layer
  + MLP Classification Head

Use for: clinical image or drawing input + CHW notes → risk/classification output.
Integrates with model-dev/training/fine_tune.py for fine-tuning and optional
differential privacy (Opacus).
"""
from __future__ import annotations

from typing import Any, Optional, Union

import torch
import torch.nn as nn

# Default embedding dim (MedSigLIP-style; align with MedGemma if different)
DEFAULT_EMBED_DIM = 768


class MultimodalPediModel(nn.Module):
    """
    Vision + text fusion with MLP head for binary/multi-outcome prediction.
    Expects vision_model and text_model to return tensors of shape (batch, embed_dim).
    """

    def __init__(
        self,
        vision_model: nn.Module,
        text_model: nn.Module,
        embed_dim: int = DEFAULT_EMBED_DIM,
        num_classes: int = 1,
        dropout: float = 0.3,
    ):
        super().__init__()
        self.vision_model = vision_model
        self.text_model = text_model
        self.embed_dim = embed_dim
        self.num_classes = num_classes

        hidden = 512
        self.fusion = nn.Sequential(
            nn.Linear(embed_dim * 2, hidden),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden, 128),
            nn.ReLU(),
            nn.Dropout(dropout),
        )
        self.head = nn.Linear(128, num_classes)

    def forward(
        self,
        image: torch.Tensor,
        text_input: Union[torch.Tensor, Any],
    ) -> torch.Tensor:
        """
        image: (B, ...) — input to vision encoder
        text_input: (B, ...) or dict — input to text encoder (e.g. input_ids, attention_mask)
        Returns: (B, num_classes) logits; for num_classes=1 use sigmoid for binary.
        """
        vision_embed = self.vision_model(image)
        if vision_embed.dim() > 2:
            vision_embed = vision_embed.flatten(1)
        vision_embed = vision_embed[:, : self.embed_dim]

        text_embed = self.text_model(text_input)
        if isinstance(text_embed, (list, tuple)):
            text_embed = text_embed[0]
        if text_embed.dim() > 2:
            text_embed = text_embed.flatten(1)
        text_embed = text_embed[:, : self.embed_dim]

        combined = torch.cat([vision_embed, text_embed], dim=1)
        out = self.fusion(combined)
        logits = self.head(out)
        return logits

    def forward_sigmoid(
        self,
        image: torch.Tensor,
        text_input: Union[torch.Tensor, Any],
    ) -> torch.Tensor:
        """Binary case: return probabilities (B, 1)."""
        logits = self.forward(image, text_input)
        if self.num_classes == 1:
            return torch.sigmoid(logits)
        return torch.softmax(logits, dim=-1)


def build_fusion_head_only(
    embed_dim: int = DEFAULT_EMBED_DIM,
    num_classes: int = 1,
    dropout: float = 0.3,
) -> nn.Module:
    """
    Fusion + MLP only (no encoders). Use with precomputed vision/text embeddings
    in two-step training or inference.
    """
    return nn.Sequential(
        nn.Linear(embed_dim * 2, 512),
        nn.ReLU(),
        nn.Dropout(dropout),
        nn.Linear(512, 128),
        nn.ReLU(),
        nn.Linear(128, num_classes),
    )
