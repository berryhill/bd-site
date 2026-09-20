#!/usr/bin/env python3
"""Render verification screenshots via headless Chrome.

Serves a temp directory with /assets/blog/<post-slug>/<file>.svg symlinked
to the actual asset root, so the diagrams.html file resolves relative paths.
"""
from __future__ import annotations
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
HTML_SOURCE = ROOT / "verification" / "diagrams.html"
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
    print(f"serving {directory} on http://127.0.0.1:{port}/")
    httpd.serve_forever()


def find_chrome() -> str:
    for candidate in ("google-chrome", "chromium", "chromium-browser"):
        path = shutil.which(candidate)
        if path:
            return path
    return "/usr/bin/google-chrome"


def render(url: str, out: Path, width: int, height: int, full_page: bool = False):
    chrome = find_chrome()
    args = [
        chrome,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        f"--window-size={width},{height}",
        f"--screenshot={out}",
        "--virtual-time-budget=4000",
        url,
    ]
    if full_page:
        args.append("--full-page")
    print(f"running: {' '.join(args)}")
    res = subprocess.run(args, capture_output=True, text=True, timeout=60)
    if res.returncode != 0:
        print("stdout:", res.stdout)
        print("stderr:", res.stderr)
        sys.exit(res.returncode)
    if not out.exists():
        print(f"missing screenshot: {out}")
        sys.exit(1)
    print(f"wrote {out} ({out.stat().st_size} bytes)")


def main():
    # Set up a serve directory with the right shape.
    tmp = Path(tempfile.mkdtemp(prefix="diagram-render-"))
    assets_link = tmp / "assets"
    assets_link.mkdir()
    blog_link = assets_link / "blog"
    blog_link.mkdir()
    slug_link = blog_link / "scoring-definition-is-the-lever-in-multi-agent-deliberation-evals"
    slug_link.symlink_to(ASSET_DIR)
    verification_link = tmp / "verification"
    verification_link.symlink_to(ROOT / "verification")

    port = free_port()
    t = threading.Thread(target=serve, args=(tmp, port), daemon=True)
    t.start()
    time.sleep(0.6)

    base = f"http://127.0.0.1:{port}/verification/diagrams.html"

    desktop_out = SCREENSHOT_DIR / "desktop.png"
    mobile_out = SCREENSHOT_DIR / "mobile-390.png"

    try:
        render(base, desktop_out, width=1280, height=1800, full_page=True)
        render(base, mobile_out, width=390, height=2400, full_page=True)
    finally:
        # Cleanup tmp
        try:
            shutil.rmtree(tmp)
        except Exception as exc:
            print(f"warning: cleanup failed: {exc}")

    print("done")


if __name__ == "__main__":
    main()