import sys
from pathlib import Path

import numpy as np
import pytest

# Allow importing data and preprocess from repo root
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from data import synth_images
from preprocess import embed


def test_synthetic_images_created(tmp_path):
    out = tmp_path / "synth"
    synth_images.main(out_dir=str(out), n=2)
    files = list(out.glob("*.png"))
    assert len(files) == 2


def test_extract_embedding_pseudo(tmp_path):
    out = tmp_path / "synth"
    synth_images.main(out_dir=str(out), n=1)
    img = next(Path(out).glob("*.png"))
    emb = embed.extract_embedding_from_image_path(
        str(img), model_name=None, target_size=(128, 128), dim=256
    )
    assert isinstance(emb, np.ndarray)
    assert emb.shape == (1, 256)
    assert emb.dtype == np.float32
    norms = np.linalg.norm(emb, axis=-1)
    assert pytest.approx(1.0, rel=1e-4) == float(norms[0])


def test_embedding_saved_and_loaded(tmp_path):
    out = tmp_path / "synth"
    synth_images.main(out_dir=str(out), n=1)
    img = next(Path(out).glob("*.png"))
    emb = embed.extract_embedding_from_image_path(
        str(img), model_name=None, target_size=(64, 64), dim=64
    )
    save_path = tmp_path / "emb.npy"
    np.save(save_path, emb)
    loaded = np.load(save_path)
    assert loaded.shape == emb.shape
    assert np.allclose(loaded, emb)
