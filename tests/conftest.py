"""Pytest configuration and fixtures."""
import os

import pytest


def pytest_configure(config):
    """Set dummy/fallback mode before any imports for CI."""
    os.environ.setdefault("USE_DUMMY", "1")
    os.environ.setdefault("REAL_MODE", "false")
    os.environ.setdefault("EMBED_MODE", "dummy")


def _ensure_drawing_fixture():
    """Create drawing.jpg if missing (programmatic 64x64 image)."""
    path = os.path.join(os.path.dirname(__file__), "fixtures", "drawing.jpg")
    if os.path.exists(path):
        return path
    try:
        from PIL import Image

        os.makedirs(os.path.dirname(path), exist_ok=True)
        img = Image.new("RGB", (64, 64), color=(255, 255, 255))
        for i in range(10, 50):
            img.putpixel((i, 30), (0, 0, 0))
        img.save(path, "JPEG", quality=85)
    except ImportError:
        # Minimal valid JPEG (1x1 gray) if Pillow unavailable
        minimal_jpeg = (
            b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
            b"\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c"
            b"\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a"
            b"\x1c\x1c $.\' \",#\x1c\x1c(7),01444\x1f\'9=82<.342\xff\xc0\x00\x0b\x08"
            b"\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x14\x00\x01\x00\x00\x00"
            b"\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xda\x00\x08"
            b"\x01\x01\x00\x00?\x00\x7f\xff\xd9"
        )
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            f.write(minimal_jpeg)
    return path


@pytest.fixture(scope="session")
def drawing_fixture_path():
    return _ensure_drawing_fixture()


@pytest.fixture(autouse=True)
def use_dummy_embed_server(monkeypatch):
    """Use dummy/fallback mode in tests to avoid model downloads."""
    monkeypatch.setenv("USE_DUMMY", "1")
    monkeypatch.setenv("REAL_MODE", "false")
    monkeypatch.setenv("EMBED_MODE", "dummy")
