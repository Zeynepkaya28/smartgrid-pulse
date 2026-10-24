"""Assemble captured frames into the README demo GIF (target 30-45 s).

    uv run --with pillow python scripts/demo/make_gif.py <frames_dir> docs/demo.gif
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

TARGET_S = 38.0
WIDTH = 960
HOLD_LAST_MS = 3000


def font(size: int) -> ImageFont.ImageFont | ImageFont.FreeTypeFont:
    for name in ("segoeuib.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main() -> None:
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    frames = json.loads((src / "frames.json").read_text(encoding="utf-8"))
    label_font = font(22)
    images: list[Image.Image] = []
    for f in frames:
        img = Image.open(f["file"]).convert("RGB")
        img = img.resize((WIDTH, round(img.height * WIDTH / img.width)), Image.Resampling.LANCZOS)
        draw = ImageDraw.Draw(img)
        t = f["t"]
        text = "Normal" if t < 0 else f"Motoru Isıt  +{t} sn  ·  {f['status']}"
        box = draw.textbbox((0, 0), text, font=label_font)
        w, h = box[2] - box[0], box[3] - box[1]
        x, y = WIDTH - w - 28, img.height - h - 30
        draw.rounded_rectangle((x - 14, y - 10, x + w + 14, y + h + 14), radius=14, fill=(29, 29, 31))
        draw.text((x, y - 2), text, font=label_font, fill=(255, 255, 255))
        images.append(img.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE))

    per_frame = max(80, round(TARGET_S * 1000 / len(images)))
    durations = [per_frame] * len(images)
    durations[-1] = HOLD_LAST_MS
    dst.parent.mkdir(parents=True, exist_ok=True)
    images[0].save(dst, save_all=True, append_images=images[1:], duration=durations, loop=0, optimize=True)
    total = sum(durations) / 1000
    print(f"{dst}: {len(images)} frames, {total:.1f} s, {dst.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
