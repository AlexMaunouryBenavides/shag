"""Génère les icônes de l'application (public/icons/) : un « Ш » à l'encre sur papier, marge rouge.

Usage : python -I tools/make_icons.py
"""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "icons"
PAPER = (238, 241, 243)
INK = (36, 48, 122)
MARGIN = (200, 50, 58)


def icon(size: int, maskable: bool) -> Image.Image:
    s = size / 512
    img = Image.new("RGB", (size, size), PAPER)
    d = ImageDraw.Draw(img)
    # zone sûre des icônes « maskable » : on resserre le dessin
    k = 0.72 if maskable else 1.0
    cx, cy = size / 2, size / 2

    def box(x0, y0, x1, y1, color):
        d.rectangle([cx + (x0 - 256) * s * k, cy + (y0 - 256) * s * k,
                     cx + (x1 - 256) * s * k, cy + (y1 - 256) * s * k], fill=color)

    box(150, 40, 162, 472, MARGIN)  # marge du cahier
    # Ш : trois jambages + base
    for x in (212, 300, 388):
        box(x, 132, x + 44, 380, INK)
    box(212, 336, 432, 380, INK)
    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for size in (192, 512):
        icon(size, False).save(OUT / f"icon-{size}.png")
        icon(size, True).save(OUT / f"maskable-{size}.png")
    icon(180, False).save(OUT / "apple-touch-icon.png")
    icon(64, False).save(OUT / "favicon.png")
    print("icônes écrites dans", OUT)


if __name__ == "__main__":
    main()
