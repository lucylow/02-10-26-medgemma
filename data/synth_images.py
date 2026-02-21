"""
data/synth_images.py

Generate small synthetic images for testing/demos (no PHI).
Creates a directory data/synth/ with PNG images.
"""

import argparse
import os

from PIL import Image, ImageDraw, ImageFont


def make_synthetic_image(path: str, size=(256, 256), seed: int = 0, text: str = None):
    img = Image.new("RGB", size, (240, 248, 255))
    draw = ImageDraw.Draw(img)
    r = (seed % 80) + 20
    draw.ellipse((20, 20, 20 + r, 20 + r), outline=(26, 115, 232), width=4)
    draw.line((size[0] // 2, 10, size[0] // 2, size[1] - 10), fill=(0, 188, 212), width=3)
    if text:
        try:
            font = ImageFont.load_default()
            draw.text((10, size[1] - 20), text, fill=(32, 33, 36), font=font)
        except Exception:
            pass
    img.save(path, format="PNG")


def main(out_dir="data/synth", n=5):
    os.makedirs(out_dir, exist_ok=True)
    for i in range(n):
        p = os.path.join(out_dir, f"synth_{i:03d}.png")
        make_synthetic_image(p, seed=i, text=f"img{i}")
    print("Wrote", n, "images to", out_dir)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--out_dir", default="data/synth")
    p.add_argument("--n", type=int, default=5)
    args = p.parse_args()
    main(args.out_dir, args.n)
