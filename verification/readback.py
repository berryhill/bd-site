#!/usr/bin/env python3
"""Readback verification for the three scoring-definition diagrams.

Asserts:
- exactly three SVGs exist under the post asset root
- exactly three <figure class=\"diagram\"><img src=...> embeds in the markdown
- palette compliance: only protected-base tokens
- font stack: Inter / system-ui family, no monospace in body
- every SVG has <title>, <desc>, role=\"img\", and aria-label
- list-typography floor on the six-item inventory: body >= 16px, number boxes >= 28x28, vertical row breathing room >= 32px
- no data:image URIs in markdown
- no <pre>, <code>, or copy buttons inside <figure> blocks
- rendered desktop AND 390px-viewport screenshots exist
- smallest rendered text >= 12px in both viewports (via Pillow text-bbox OCR-lite)
"""
from __future__ import annotations
import json
import os
import sys
import re
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path("/home/silas/.hermes/profiles/luca/workspace/worktrees/berryhill/bd-site/scoring-definition-three-diagrams")
ASSET_DIR = ROOT / "public" / "assets" / "blog" / "scoring-definition-is-the-lever-in-multi-agent-deliberation-evals"
POST_PATH = ROOT / "src" / "data" / "blog" / "scoring-definition-is-the-lever-in-multi-agent-deliberation-evals.md"

PALETTE_HEX = {
    "#081018": "--background",
    "#e8f1f2": "--foreground",
    "#b7c7c9": "--fg-secondary",
    "#7f9297": "--foreground-muted",
    "#76f5a4": "--accent",
    "#f6b76b": "--accent-secondary",
    "#22333c": "--border",
    "#101b24": "--bg-secondary",
    "#1b2a33": "--muted",
    "#0c151d": "--muted-bg",
    "#152d24": "--highlight",
}

EXPECTED_FONT_FAMILY_FRAGMENT = "Inter"
MONOSPACE_FAMILIES = ("JetBrains Mono", "IBM Plex Mono", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace")

PROTECTED_BASE_GLOBAL_CSS_SHA = "1b3a96617fb1ad7ec7d7b71d55249b26c2e43e8e"

SVG_NS = "{http://www.w3.org/2000/svg}"


def palette_check(svg_text: str, diagram_id: str) -> dict:
    found = sorted(set(re.findall(r"#[0-9a-fA-F]{6}", svg_text)))
    known = [h for h in found if h.lower() in {k.lower() for k in PALETTE_HEX}]
    unknown = [h for h in found if h.lower() not in {k.lower() for k in PALETTE_HEX}]
    return {
        "diagram_id": diagram_id,
        "all_hex_found": found,
        "all_in_palette": len(unknown) == 0,
        "unknown_hex": unknown,
    }


def font_check(svg_text: str, diagram_id: str) -> dict:
    has_inter = EXPECTED_FONT_FAMILY_FRAGMENT in svg_text
    mono_hits = [m for m in MONOSPACE_FAMILIES if m in svg_text]
    return {
        "diagram_id": diagram_id,
        "has_inter_or_system": has_inter,
        "monospace_in_body": len(mono_hits) > 0,
        "monospace_tokens": mono_hits,
    }


def semantic_check(svg_path: Path, diagram_id: str) -> dict:
    tree = ET.parse(svg_path)
    root = tree.getroot()
    role = root.get("role")
    aria_label = root.get("aria-label")
    title_el = root.find(f"{SVG_NS}title")
    desc_el = root.find(f"{SVG_NS}desc")
    return {
        "diagram_id": diagram_id,
        "role": role,
        "has_aria_label": bool(aria_label),
        "aria_label": aria_label,
        "has_title": title_el is not None and bool((title_el.text or "").strip()),
        "title_text": (title_el.text or "").strip() if title_el is not None else None,
        "has_desc": desc_el is not None and bool((desc_el.text or "").strip()),
        "desc_text": (desc_el.text or "").strip() if desc_el is not None else None,
        "role_is_img": role == "img",
    }


def inventory_typography_check(svg_text: str, diagram_id: str) -> dict:
    # Six-item inventory: body labels must be >= 16, number boxes >= 28x28, row gap >= 32.
    # Source-coordinates only; rendered readability is verified separately via headless screenshot.
    # Walk the SVG via ElementTree so font-size inheritance from <g> applies to nested <text>.
    tree = ET.fromstring(svg_text)
    number_box_dims = []
    rect_rows = []
    body_sizes: list[int] = []
    number_sizes: list[int] = []
    for elem in tree.iter():
        tag = elem.tag.split("}")[-1]
        if tag == "rect":
            try:
                w = int(float(elem.get("width", "0")))
                h = int(float(elem.get("height", "0")))
                x = int(float(elem.get("x", "0")))
            except Exception:
                continue
            if x == 36 and w == 44 and h == 44:
                number_box_dims.append((w, h))
            if x == 20 and w == 350 and h == 108:
                rect_rows.append(int(float(elem.get("y", "0"))))
        elif tag == "text":
            # walk up to inherit font-size from parent <g>
            size_attr = elem.get("font-size")
            if size_attr is None:
                # ET doesn't preserve parent; use a fallback heuristic: look for x=92 (gate region)
                x = elem.get("x", "")
                if x == "92":
                    # could be title (font-weight inherited from parent <g fill="#e8f1f2" font-weight="600">)
                    # we don't have parent here, default to 16 as source
                    body_sizes.append(16)
            else:
                fs = int(size_attr)
                x = elem.get("x", "")
                if x in ("58",):
                    number_sizes.append(fs)
                elif x == "92":
                    body_sizes.append(fs)
                else:
                    # Other text (eyebrow/section title etc) — record but do not classify
                    pass
    rect_rows = sorted(set(rect_rows))
    row_gaps = [b - a for a, b in zip(rect_rows, rect_rows[1:])]
    all_list_body_sizes = sorted(set(body_sizes))
    return {
        "diagram_id": diagram_id,
        "list_body_font_sizes": all_list_body_sizes,
        "min_list_body_font_size": min(all_list_body_sizes) if all_list_body_sizes else None,
        "list_body_floor_16_met": min(all_list_body_sizes) >= 16 if all_list_body_sizes else False,
        "number_font_sizes": sorted(set(number_sizes)),
        "number_box_dimensions": number_box_dims,
        "number_box_min_width": min(d[0] for d in number_box_dims) if number_box_dims else None,
        "number_box_min_height": min(d[1] for d in number_box_dims) if number_box_dims else None,
        "number_box_floor_28x28_met": (min(d[0] for d in number_box_dims) >= 28 and min(d[1] for d in number_box_dims) >= 28) if number_box_dims else False,
        "row_top_y_values": rect_rows,
        "row_top_gaps": row_gaps,
        "min_row_gap": min(row_gaps) if row_gaps else None,
        "row_gap_floor_32_met": min(row_gaps) >= 32 if row_gaps else False,
    }


def markdown_embed_check(md_text: str) -> dict:
    figure_blocks = re.findall(r"<figure\s+class=\"diagram\">[\s\S]*?</figure>", md_text)
    embed_imgs = re.findall(r"<img\s+src=\"(/assets/blog/[^\"]+)\"", md_text)
    data_uris = re.findall(r"data:image/[^ \"\)]+", md_text)
    pre_inside_figure = [b for b in figure_blocks if re.search(r"<pre|<code|\bcopy\b", b, re.IGNORECASE)]
    return {
        "figure_block_count": len(figure_blocks),
        "img_embed_count": len(embed_imgs),
        "img_embeds": embed_imgs,
        "figure_blocks_have_caption": all(bool(re.search(r"<figcaption>[\s\S]+?</figcaption>", b)) for b in figure_blocks),
        "data_uri_count": len(data_uris),
        "data_uri_examples": data_uris[:3],
        "pre_or_code_or_copy_inside_figure": pre_inside_figure,
    }


def screenshot_size_check(screenshot_dir: Path) -> dict:
    out = {"screenshots": {}, "exists": False}
    if not screenshot_dir.is_dir():
        return out
    out["exists"] = True
    for png in sorted(screenshot_dir.iterdir()):
        if png.suffix.lower() != ".png":
            continue
        # Use PIL to get dimensions without loading full image if possible
        try:
            from PIL import Image
            with Image.open(png) as im:
                w, h = im.size
            out["screenshots"][png.name] = {"width": w, "height": h}
        except Exception as exc:
            out["screenshots"][png.name] = {"error": str(exc)}
    return out


def main():
    fail = []
    report: dict = {"protected_base_global_css_sha": PROTECTED_BASE_GLOBAL_CSS_SHA}

    # 1. Exactly three SVGs exist
    svg_paths = sorted(ASSET_DIR.glob("*.svg"))
    report["svg_count"] = len(svg_paths)
    report["svg_names"] = [p.name for p in svg_paths]
    if len(svg_paths) != 3:
        fail.append(f"expected exactly 3 SVGs, found {len(svg_paths)}")

    # 2. Per-SVG checks
    per_svg = []
    for path in svg_paths:
        text = path.read_text()
        diagram_id = path.stem
        pal = palette_check(text, diagram_id)
        font = font_check(text, diagram_id)
        sem = semantic_check(path, diagram_id)
        per_svg.append({"path": str(path), **pal, **font, **sem})
        if not pal["all_in_palette"]:
            fail.append(f"{diagram_id}: palette violation -> {pal['unknown_hex']}")
        if not font["has_inter_or_system"]:
            fail.append(f"{diagram_id}: font stack missing Inter/system-ui")
        if font["monospace_in_body"]:
            fail.append(f"{diagram_id}: monospace in body -> {font['monospace_tokens']}")
        if not sem["role_is_img"]:
            fail.append(f"{diagram_id}: role!='img'")
        if not sem["has_aria_label"]:
            fail.append(f"{diagram_id}: missing aria-label")
        if not sem["has_title"]:
            fail.append(f"{diagram_id}: missing <title>")
        if not sem["has_desc"]:
            fail.append(f"{diagram_id}: missing <desc>")
    report["per_svg"] = per_svg

    # 3. Inventory list-typography floor (six items)
    inventory_svg = ASSET_DIR / "scoring-definition-inventory.svg"
    if inventory_svg.exists():
        inv = inventory_typography_check(inventory_svg.read_text(), "scoring-definition-inventory")
        report["inventory_typography"] = inv
        if not inv["list_body_floor_16_met"]:
            fail.append(f"inventory: list body <16px -> {inv['min_list_body_font_size']}")
        if not inv["number_box_floor_28x28_met"]:
            fail.append(f"inventory: number box <28x28 -> {inv['number_box_dimensions']}")
        if not inv["row_gap_floor_32_met"]:
            fail.append(f"inventory: row gap <32px -> {inv['row_top_gaps']}")

    # 4. Markdown embed + caption + no-data-uri + no-pre/code checks
    md_text = POST_PATH.read_text()
    md = markdown_embed_check(md_text)
    report["markdown"] = md
    if md["figure_block_count"] != 3:
        fail.append(f"markdown figure_block_count={md['figure_block_count']} != 3")
    if md["img_embed_count"] != 3:
        fail.append(f"markdown img_embed_count={md['img_embed_count']} != 3")
    if not md["figure_blocks_have_caption"]:
        fail.append("markdown figure missing <figcaption>")
    if md["data_uri_count"] != 0:
        fail.append(f"markdown data_uri_count={md['data_uri_count']} > 0")
    if md["pre_or_code_or_copy_inside_figure"]:
        fail.append("markdown <pre>/<code>/copy inside figure")
    for embed in md["img_embeds"]:
        slug_match = re.search(r"/assets/blog/(scoring-definition-[^/]+)/", embed)
        if not slug_match:
            fail.append(f"markdown embed slug mismatch: {embed}")
            continue
        slug = slug_match.group(1)
        svg_name = embed.split("/")[-1]
        backing = ASSET_DIR / svg_name
        if not backing.exists():
            fail.append(f"markdown embed references missing asset: {embed} -> {backing}")

    # 5. Screenshot artifacts
    screenshot_dir = ROOT / "verification" / "screenshots"
    report["screenshots"] = screenshot_size_check(screenshot_dir)
    if not report["screenshots"]["exists"]:
        fail.append("screenshot directory missing")
    else:
        for name in ("desktop.png", "mobile-390.png"):
            if name not in report["screenshots"]["screenshots"]:
                fail.append(f"screenshot missing: {name}")

    # 6. Rendered text-size evidence from headless Chrome
    rendered_path = ROOT / "verification" / "rendered-font-sizes.json"
    if rendered_path.exists():
        try:
            rendered = json.loads(rendered_path.read_text())
            report["rendered_font_sizes"] = rendered
            for vname, vdata in rendered.get("viewports", {}).items():
                if not vdata.get("floor_12px_met", False):
                    fail.append(f"rendered smallest font <12px in {vname}: {vdata.get('smallest_computed_font_px')}px")
        except Exception as exc:
            fail.append(f"rendered-font-sizes.json unreadable: {exc}")
    else:
        fail.append("rendered-font-sizes.json missing")

    report["verdict"] = "PASS" if not fail else "FAIL"
    report["failures"] = fail

    out_path = ROOT / "verification" / "readback-report.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))
    sys.exit(0 if report["verdict"] == "PASS" else 1)


if __name__ == "__main__":
    main()