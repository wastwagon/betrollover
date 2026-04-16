#!/usr/bin/env python3
"""
Rebuild Google Play **feature graphic** (1024×500) from phone mockups in
``play-store-assets-v2/``. Run after ``build-play-store-phone-shots.py``.

Layout: split canvas — calm gradient, short copy + accent line on the left;
three larger phones (home, marketplace, leaderboard) on the right with light
shadows (fewer devices than four-across reads cleaner at 1024×500).

Requires: Pillow. Optional: numpy (faster gradient).
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

REPO = Path(__file__).resolve().parents[1]
ASSETS = REPO / "play-store-assets-v2"

CANVAS_W, CANVAS_H = 1024, 500

# Three screens read clearly at this size; avoids a cramped “fan of four”.
PHONE_FILES = [
    "phone-shot-01-1080x1920.png",
    "phone-shot-02-1080x1920.png",
    "phone-shot-04-1080x1920.png",
]

OUT_NAME = "play-feature-graphic-1024x500.png"

ACCENT = (52, 211, 153)  # mint — aligns with product primary


def _gradient_rgb(w: int, h: int) -> Image.Image:
    top = (7, 11, 22)
    bottom = (12, 46, 42)
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


def _soft_vignette(base: Image.Image) -> None:
    """Darken left/right edges slightly (in-place on RGBA)."""
    w, h = base.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    for alpha, x0, x1 in ((38, 0, 120), (38, w - 120, w)):
        d.rectangle((x0, 0, x1, h), fill=(0, 0, 0, alpha))
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=40))
    base.alpha_composite(overlay)


def _load_font(size: int, bold: bool) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    paths: list[str] = []
    if bold:
        paths.extend(
            [
                "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
                "/System/Library/Fonts/Supplemental/Arial.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            ]
        )
    else:
        paths.extend(
            [
                "/System/Library/Fonts/Supplemental/Arial.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            ]
        )
    for p in paths:
        if Path(p).is_file():
            try:
                return ImageFont.truetype(p, size)
            except OSError:
                continue
    return ImageFont.load_default()


def _paste_rounded_icon(base: Image.Image, icon: Image.Image, xy: tuple[int, int], size: int, radius: int) -> None:
    icon = icon.resize((size, size), Image.Resampling.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    layer.paste(icon, (0, 0), mask)
    ring = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    rd.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, outline=(255, 255, 255, 38), width=1)
    layer.alpha_composite(ring)
    base.paste(layer, xy, layer)


def _phone_shadow_layer(w: int, h: int, radius: int) -> Image.Image:
    pad = 28
    shadow = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle(
        (pad, pad, pad + w - 1, pad + h - 1),
        radius=radius,
        fill=(0, 0, 0, 72),
    )
    return shadow.filter(ImageFilter.GaussianBlur(radius=14))


def _paste_phone_row(
    base: Image.Image,
    phones: list[Image.Image],
    overlap: int,
    margin_right: int,
    margin_bottom: int,
    max_left_x: int,
) -> None:
    n = len(phones)
    avail_h = CANVAS_H - margin_bottom - 28
    pw0, ph0 = phones[0].size
    max_phone_row_w = CANVAS_W - margin_right - max_left_x

    scale_h = avail_h
    while scale_h > 200:
        tw = max(1, int(round(scale_h * pw0 / ph0)))
        total_w = n * tw - (n - 1) * overlap
        if total_w <= max_phone_row_w:
            break
        scale_h -= 4

    th = scale_h
    tw = max(1, int(round(th * pw0 / ph0)))
    scaled = [p.resize((tw, th), Image.Resampling.LANCZOS) for p in phones]

    total_w = n * tw - (n - 1) * overlap
    x0 = max(max_left_x, CANVAS_W - margin_right - total_w)
    y0 = CANVAS_H - margin_bottom - th
    r = min(36, tw // 5)

    for i, im in enumerate(scaled):
        x = x0 + i * (tw - overlap)
        sh = _phone_shadow_layer(im.width, im.height, r)
        base.alpha_composite(sh, (x - 14, y0 - 10))
        base.paste(im, (x, y0), im if im.mode == "RGBA" else None)


def build_feature_graphic(assets_dir: Path) -> Image.Image:
    paths = [assets_dir / name for name in PHONE_FILES]
    missing = [p for p in paths if not p.is_file()]
    if missing:
        raise FileNotFoundError("Missing phone mockups:\n  " + "\n  ".join(str(p) for p in missing))

    phones = [Image.open(p).convert("RGBA") for p in paths]

    base = _gradient_rgb(CANVAS_W, CANVAS_H).convert("RGBA")
    _soft_vignette(base)
    draw = ImageDraw.Draw(base)

    margin_l = 44
    accent_x = margin_l
    bar_top, bar_bottom = 96, 404
    draw.rounded_rectangle(
        (accent_x, bar_top, accent_x + 4, bar_bottom),
        radius=2,
        fill=ACCENT + (255,),
    )

    title_font = _load_font(44, bold=True)
    sub_font = _load_font(16, bold=False)
    hint_font = _load_font(13, bold=False)

    tx = margin_l + 20
    title = "BetRollover"
    sub_l1 = "Expert picks from verified tipsters."
    sub_l2 = "Escrow-ready marketplace & live leaderboard."
    draw.text((tx, 108), title, fill=(255, 255, 255, 255), font=title_font)
    draw.text((tx, 168), sub_l1, fill=(210, 228, 222, 255), font=sub_font)
    draw.text((tx, 192), sub_l2, fill=(210, 228, 222, 255), font=sub_font)
    draw.text(
        (tx, 236),
        "Home  ·  Marketplace  ·  Leaderboard",
        fill=(ACCENT[0], ACCENT[1], ACCENT[2], 220),
        font=hint_font,
    )

    icon_path = assets_dir / "play-icon-512.png"
    if icon_path.is_file():
        ic = Image.open(icon_path).convert("RGBA")
        _paste_rounded_icon(base, ic, (margin_l + 20, 36), size=52, radius=14)

    _paste_phone_row(
        base,
        phones,
        overlap=56,
        margin_right=20,
        margin_bottom=18,
        max_left_x=318,
    )

    return base.convert("RGB")


def main() -> int:
    assets_dir = ASSETS
    if len(sys.argv) > 1:
        assets_dir = Path(sys.argv[1]).resolve()

    if not assets_dir.is_dir():
        print("Not a directory:", assets_dir, file=sys.stderr)
        return 1

    try:
        out = build_feature_graphic(assets_dir)
    except FileNotFoundError as e:
        print(e, file=sys.stderr)
        return 1

    dest = assets_dir / OUT_NAME
    assets_dir.mkdir(parents=True, exist_ok=True)
    out.save(dest, "PNG", optimize=True)
    print("Wrote", dest)

    legacy = REPO / "play-store-assets"
    if legacy.is_dir() and assets_dir.resolve() != legacy.resolve():
        legacy_path = legacy / OUT_NAME
        out.save(legacy_path, "PNG", optimize=True)
        print("Wrote", legacy_path)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
