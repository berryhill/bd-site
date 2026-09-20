#!/usr/bin/env python3
"""Render each SVG at 390px and 1280px viewports, then verify the smallest
computed font-size across all <text> elements is >= 12px.

Strategy:
- Use headless Chrome with --window-size and --dump-dom to obtain rendered HTML
- Inline the SVG directly into a measuring HTML page so no async fetch is needed
- Parse the data-result attribute and aggregate smallest font-size across diagrams
"""
from __future__ import annotations
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
from functools import partial
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

ROOT = Path("/home/silas/.hermes/profiles/luca/workspace/worktrees/berryhill/bd-site/scoring-definition-three-diagrams")
ASSET_DIR = ROOT / "public" / "assets" / "blog" / "scoring-definition-is-the-lever-in-multi-agent-deliberation-evals"
SLUG = "scoring-definition-is-the-lever-in-multi-agent-deliberation-evals"
SCREENSHOT_DIR = ROOT / "verification" / "screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)


def free_port() -> int:
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


def serve(directory: Path, port: int):
    os.chdir(directory)
    handler = partial(SimpleHTTPRequestHandler, directory=str(directory))
    httpd = HTTPServer(("127.0.0.1", port), handler)
    httpd.serve_forever()


def find_chrome() -> str:
    for c in ("google-chrome", "chromium", "chromium-browser"):
        p = shutil.which(c)
        if p:
            return p
    return "/usr/bin/google-chrome"


def render_html_dump(url: str, viewport_width: int, viewport_height: int = 1200) -> str:
    chrome = find_chrome()
    cmd = [chrome, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
           f"--window-size={viewport_width},{viewport_height}", "--virtual-time-budget=4000",
           "--dump-dom", url]
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if res.returncode != 0:
        raise RuntimeError(f"chrome failed: {res.stderr[:500]}")
    return res.stdout


def build_measure_html(svg_text: str, viewport_width: int) -> str:
    # Inline the SVG. Width:100% inside container of viewport_width px.
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
html,body{{margin:0;padding:0;background:#081018;}}
.box{{width:{viewport_width - 24}px;padding:12px;}}
.box svg{{display:block;width:100%;height:auto;}}
</style></head><body>
<div class="box">{svg_text}</div>
<script>
window.__ready__ = false;
window.__result__ = null;
function compute(){{
  const svg = document.querySelector('.box svg');
  const fig = svg.getBoundingClientRect();
  const texts = Array.from(svg.querySelectorAll('text'));
  const items = texts.map(t=>{{
    const cs = window.getComputedStyle(t);
    return {{
      text: (t.textContent||'').trim().slice(0,40),
      attrFontSize: t.getAttribute('font-size'),
      parentAttrFontSize: t.parentElement && t.parentElement.getAttribute && t.parentElement.getAttribute('font-size'),
      computedFontSizePx: parseFloat(cs.fontSize),
      x: parseFloat(t.getAttribute('x')||'0'),
      y: parseFloat(t.getAttribute('y')||'0')
    }};
  }});
  window.__result__ = {{ svgWidth: fig.width, svgHeight: fig.height, items: items }};
  window.__ready__ = true;
  document.body.setAttribute('data-result', JSON.stringify(window.__result__));
}}
// Allow layout
requestAnimationFrame(()=>requestAnimationFrame(compute));
</script>
</body></html>"""


def measure_one(svg_path: Path, viewport_width: int) -> dict:
    svg_text = svg_path.read_text()
    html_text = build_measure_html(svg_text, viewport_width)
    tmp = Path(tempfile.mkdtemp(prefix="measure-"))
    try:
        (tmp / "index.html").write_text(html_text)
        port = free_port()
        t = threading.Thread(target=serve, args=(tmp, port), daemon=True)
        t.start()
        time.sleep(0.6)
        out = render_html_dump(f"http://127.0.0.1:{port}/index.html", viewport_width)
    finally:
        try:
            shutil.rmtree(tmp)
        except Exception:
            pass
    import re
    m = re.search(r'data-result="([^"]*)"', out)
    if not m:
        return {"error": "no data-result", "excerpt": out[-500:]}
    raw = m.group(1)
    raw = raw.replace("&quot;", '"').replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    try:
        return json.loads(raw)
    except Exception as exc:
        return {"error": f"parse: {exc}", "raw": raw[:500]}


def render_screenshot(svg_path: Path, out_path: Path, viewport_width: int, viewport_height: int = 2400):
    """Render the actual SVG via headless Chrome for the contact sheet."""
    chrome = find_chrome()
    cmd = [chrome, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
           f"--window-size={viewport_width},{viewport_height}", f"--screenshot={out_path}",
           "--virtual-time-budget=4000", "--full-page", svg_path.as_uri()]
    subprocess.run(cmd, capture_output=True, text=True, timeout=60)


def main():
    out: dict = {"viewports": {}, "diagrams": {}}
    diagrams = ["range-versus-baseline", "two-route-convergence", "scoring-definition-inventory"]
    for viewport_name, viewport_width in [("desktop", 1280), ("mobile-390", 390)]:
        view_data: dict = {"width": viewport_width, "smallest_computed_font_px": None, "items": []}
        for name in diagrams:
            svg_path = ASSET_DIR / f"{name}.svg"
            data = measure_one(svg_path, viewport_width)
            items = data.get("items", [])
            if items:
                sizes = [it["computedFontSizePx"] for it in items if it["computedFontSizePx"]]
                if sizes:
                    if view_data["smallest_computed_font_px"] is None or min(sizes) < view_data["smallest_computed_font_px"]:
                        view_data["smallest_computed_font_px"] = min(sizes)
                    view_data["items"].extend([{"diagram": name, **it} for it in items])
        # Render a combined contact sheet
        view_data["floor_12px_met"] = view_data["smallest_computed_font_px"] is not None and view_data["smallest_computed_font_px"] >= 12.0
        out["viewports"][viewport_name] = view_data
    out["diagrams"] = diagrams
    # Write screenshot contact sheets via standalone render
    for name in diagrams:
        svg_path = ASSET_DIR / f"{name}.svg"
        for vw in (1280, 390):
            out_path = SCREENSHOT_DIR / f"{name}-{'desktop' if vw == 1280 else 'mobile-390'}.png"
            render_screenshot(svg_path, out_path, vw)
    # Persist
    (ROOT / "verification" / "rendered-font-sizes.json").write_text(json.dumps(out, indent=2))
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()