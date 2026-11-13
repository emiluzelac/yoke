"""Build resources/yoke-icons.woff, the one-glyph icon font behind $(yoke-logo).

VS Code draws a language model provider's `icon` in the model picker's tab
bar. An image icon keeps its own colors in every theme; a font icon is tinted
and dimmed by the theme exactly like the codicons beside it (Copilot's tab),
so Yoke ships its glyph as a font, contributed under `contributes.icons`.

Source: yoke-glyph.svg (100x100). Paths with `fill:none` are ignored, paths
filled white are cut out of the rest as holes, everything else is the glyph.
The result is fitted to the codicon grid (300 units, ascent 300, descent 0).

Run from the repo root:
  uvx --from fonttools --with skia-pathops python scripts/icon-font/build.py
"""

import re
import xml.etree.ElementTree as ET
from pathlib import Path

import pathops
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.svgLib.path import parse_path

HERE = Path(__file__).parent
SOURCE = HERE / "yoke-glyph.svg"
OUTPUT = HERE.parent.parent / "resources" / "yoke-icons.woff"

EM = 300  # codicon grid
HEIGHT = 276  # glyph height in font units, centered vertically
CODEPOINT = 0xE001  # package.json: "fontCharacter": "\\E001"


def fill_of(el):
    style = el.get("style", "")
    m = re.search(r"fill\s*:\s*([^;]+)", style)
    return (m.group(1) if m else el.get("fill", "#000")).strip().lower()


def build_outline():
    keep, cut = pathops.Path(), pathops.Path()
    for el in ET.parse(SOURCE).getroot().iter():
        if not el.tag.endswith("path"):
            continue
        fill = fill_of(el)
        if fill == "none":
            continue
        target = cut if fill in ("#fff", "#ffffff", "white") else keep
        piece = pathops.Path()
        parse_path(el.get("d"), piece.getPen())
        piece.fillType = pathops.FillType.WINDING
        target.addPath(piece)
    keep.simplify()
    cut.simplify()
    return pathops.op(keep, cut, pathops.PathOp.DIFFERENCE)


def main():
    outline = build_outline()
    x0, y0, x1, y1 = outline.bounds  # SVG space, y down
    scale = HEIGHT / (y1 - y0)
    width = (x1 - x0) * scale
    dx = (EM - width) / 2 - x0 * scale
    top = EM - (EM - HEIGHT) / 2  # font y of the glyph's top edge
    # font_x = x*scale + dx ; font_y = top - (y - y0)*scale
    transform = (scale, 0, 0, -scale, dx, top + y0 * scale)

    pen = TTGlyphPen(None)
    outline.draw(TransformPen(Cu2QuPen(pen, max_err=0.5, reverse_direction=True), transform))
    glyph = pen.glyph()

    fb = FontBuilder(EM, isTTF=True)
    fb.setupGlyphOrder([".notdef", "yoke-logo"])
    fb.setupCharacterMap({CODEPOINT: "yoke-logo"})
    fb.setupGlyf({".notdef": TTGlyphPen(None).glyph(), "yoke-logo": glyph})
    glyph.recalcBounds(fb.font["glyf"])
    fb.setupHorizontalMetrics({".notdef": (EM, 0), "yoke-logo": (EM, glyph.xMin)})
    fb.setupHorizontalHeader(ascent=EM, descent=0)
    fb.setupNameTable({"familyName": "yoke-icons", "styleName": "Regular"})
    fb.setupOS2(sTypoAscender=EM, sTypoDescender=0, sTypoLineGap=0, usWinAscent=EM, usWinDescent=0)
    fb.setupPost()
    fb.font.flavor = "woff"
    fb.save(OUTPUT)
    print(
        "%s: glyph %.0fx%.0f of %d, bounds %s"
        % (OUTPUT.name, width, HEIGHT, EM, (glyph.xMin, glyph.yMin, glyph.xMax, glyph.yMax))
    )


if __name__ == "__main__":
    main()
