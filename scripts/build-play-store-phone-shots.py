#!/usr/bin/env python3
"""
Build Play Store phone screenshots (1080×1920): live site captures inside a large
drawn handset. Uses each PNG’s **actual** width/height so the glass aspect
matches Chrome output (avoids extra center-crop from rounding mismatch).

Requires: Pillow, Node.js, Playwright Chromium (``cd web && npx playwright install chromium``).
Optional: numpy for fast gradient (falls back without it).
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

REPO = Path(__file__).resolve().parents[1]
ASSETS = REPO / "play-store-assets-v2"
WEB_DIR = REPO / "web"
PLAYWRIGHT_CAPTURE = WEB_DIR / "scripts" / "play-store-capture.mjs"

CANVAS_W, CANVAS_H = 1080, 1920

SHOTS: list[tuple[str, str]] = [
    ("phone-shot-01-1080x1920.png", "https://betrollover.com/"),
    ("phone-shot-02-1080x1920.png", "https://betrollover.com/marketplace"),
    ("phone-shot-03-1080x1920.png", "https://betrollover.com/tipsters"),
    ("phone-shot-04-1080x1920.png", "https://betrollover.com/leaderboard"),
]

# Logical viewport / DPR live in web/scripts/play-store-capture.mjs (390×844 @3x → 1170×2532).

# Chassis (outer device) and insets so the **frame** reads clearly on store listing.
SIDE_BEZEL = 26
TOP_BEZEL = 58
BOTTOM_BEZEL = 42
BODY_RADIUS = 72
SCREEN_RADIUS = 48


def _gradient_rgb(w: int, h: int) -> Image.Image:
    top = (12, 20, 35)
    bottom = (16, 52, 46)
    try:
        import numpy as np

        t = np.linspace(0.0, 1.0, h, dtype=np.float32)[:, None]
        arr = (1.0 - t) * np.array(top, dtype=np.float32) + t * np.array(
            bottom, dtype=np.float32
        )
        arr = np.repeat(arr[:, None, :], w, axis=1)
        return Image.fromarray(arr.astype("uint8"), mode="RGB")
    except Exception:
        im = Image.new("RGB", (w, h))
        px = im.load()
        for y in range(h):
            u = y / max(h - 1, 1)
            c = tuple(int(top[i] * (1 - u) + bottom[i] * u) for i in range(3))
            for x in range(w):
                px[x, y] = c
        return im


def _rounded_mask(w: int, h: int, radius: int) -> Image.Image:
    m = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=radius, fill=255)
    return m


def _phone_layout(capture_aspect: float) -> tuple[int, int, int, int, int, int]:
    """
    Returns body_x, body_y, body_w, body_h, inner_w, inner_h
    sized to dominate the canvas while matching the capture aspect ratio.
    """
    margin_x = 32
    margin_top = 56
    margin_bottom = 52
    max_body_w = CANVAS_W - 2 * margin_x
    max_body_h = CANVAS_H - margin_top - margin_bottom

    inner_w = max_body_w - 2 * SIDE_BEZEL
    inner_h = int(round(inner_w / capture_aspect))
    body_w = inner_w + 2 * SIDE_BEZEL
    body_h = inner_h + TOP_BEZEL + BOTTOM_BEZEL

    if body_h > max_body_h:
        inner_h = max_body_h - TOP_BEZEL - BOTTOM_BEZEL
        inner_w = int(round(inner_h * capture_aspect))
        body_w = inner_w + 2 * SIDE_BEZEL
        body_h = inner_h + TOP_BEZEL + BOTTOM_BEZEL

    body_x = (CANVAS_W - body_w) // 2
    body_y = margin_top + (max_body_h - body_h) // 2
    return body_x, body_y, body_w, body_h, inner_w, inner_h


def draw_phone_frame(
    base: Image.Image,
    body_x: int,
    body_y: int,
    body_w: int,
    body_h: int,
    inner_w: int,
    inner_h: int,
) -> tuple[int, int]:
    """Draw chassis, shadow, side buttons. Returns inner screen (sx, sy)."""
    draw = ImageDraw.Draw(base, "RGBA")
    shadow_layer = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow_layer)
    sd.rounded_rectangle(
        (body_x + 10, body_y + 18, body_x + body_w + 10, body_y + body_h + 18),
        radius=BODY_RADIUS + 8,
        fill=(0, 0, 0, 110),
    )
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=18))
    base.alpha_composite(shadow_layer)

    chassis = (28, 32, 40)
    draw.rounded_rectangle(
        (body_x, body_y, body_x + body_w - 1, body_y + body_h - 1),
        radius=BODY_RADIUS,
        fill=chassis + (255,),
        outline=(55, 62, 74, 255),
        width=3,
    )

    sx = body_x + SIDE_BEZEL
    sy = body_y + TOP_BEZEL

    btn_w, btn_h, btn_r = 5, 88, 2
    bx = body_x - btn_w + 2
    for by in (body_y + 220, body_y + 340):
        draw.rounded_rectangle(
            (bx, by, bx + btn_w, by + btn_h),
            radius=btn_r,
            fill=(45, 52, 64, 255),
        )

    inset = 3
    draw.rounded_rectangle(
        (
            sx - inset,
            sy - inset,
            sx + inner_w + inset - 1,
            sy + inner_h + inset - 1,
        ),
        radius=SCREEN_RADIUS + 2,
        fill=(8, 10, 14, 255),
        outline=(60, 68, 82, 200),
        width=2,
    )

    return sx, sy


def compose_shot(screenshot: Image.Image) -> Image.Image:
    shot = screenshot.convert("RGB")
    sw, sh = shot.size
    capture_aspect = sw / sh

    body_x, body_y, body_w, body_h, inner_w, inner_h = _phone_layout(capture_aspect)
    base = _gradient_rgb(CANVAS_W, CANVAS_H).convert("RGBA")

    sx, sy = draw_phone_frame(base, body_x, body_y, body_w, body_h, inner_w, inner_h)

    # Inner rect is sized from the same aspect as the capture; resize (no cover-crop)
    # avoids accidental horizontal clipping when rounding drifts by a pixel.
    screen = shot.resize((inner_w, inner_h), Image.Resampling.LANCZOS)
    mask = _rounded_mask(inner_w, inner_h, SCREEN_RADIUS)
    base.paste(screen, (sx, sy), mask)

    return base.convert("RGB")


def playwright_screenshot(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    cmd = ["node", str(PLAYWRIGHT_CAPTURE), url, str(dest)]
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=str(WEB_DIR), timeout=180)
    if r.returncode != 0:
        raise RuntimeError(
            f"Playwright capture failed ({r.returncode}): {r.stderr or r.stdout}"
        )
    if not dest.is_file():
        raise RuntimeError(f"No screenshot file: {dest}")


def main() -> int:
    if not PLAYWRIGHT_CAPTURE.is_file():
        print("Missing", PLAYWRIGHT_CAPTURE, file=sys.stderr)
        return 1
    ASSETS.mkdir(parents=True, exist_ok=True)

    tmp = REPO / ".tmp-play-store-captures"
    tmp.mkdir(exist_ok=True)

    for filename, url in SHOTS:
        cap = tmp / (Path(filename).stem + "-capture.png")
        print("Capture", url, "->", cap.name)
        playwright_screenshot(url, cap)
        shot = Image.open(cap)
        aw, ah = shot.size
        print("  PNG size", aw, "x", ah, "aspect", round(aw / ah, 5))
        out = compose_shot(shot)
        out_path = ASSETS / filename
        out.save(out_path, "PNG", optimize=True)
        print("Wrote", out_path)

    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
