"""Create test fixtures (run once: python tests/create_fixtures.py)."""
import os

try:
    from PIL import Image
except ImportError:
    print("Pillow required: pip install Pillow")
    raise

FIXTURE_DIR = os.path.join(os.path.dirname(__file__), "fixtures")
DRAWING_PATH = os.path.join(FIXTURE_DIR, "drawing.jpg")


def create_drawing():
    os.makedirs(FIXTURE_DIR, exist_ok=True)
    img = Image.new("RGB", (64, 64), color=(255, 255, 255))
    for i in range(10, 50):
        img.putpixel((i, 30), (0, 0, 0))
    for i in range(20, 45):
        img.putpixel((25, i), (0, 0, 0))
    img.save(DRAWING_PATH, "JPEG", quality=85)
    print(f"Created {DRAWING_PATH}")


if __name__ == "__main__":
    create_drawing()
