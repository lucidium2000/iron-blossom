#!/usr/bin/env python3
"""Stamp a build id onto every script tag in index.html.

GitHub Pages serves static assets with a ten-minute cache, so a plain push
leaves visitors on the previous JS until it expires. Changing the query string
changes the URL, which makes the browser fetch the new file immediately.

Run directly to stamp with the current timestamp, or let deploy.sh call it.
"""
import pathlib
import re
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = ROOT / "index.html"


def stamp(build_id=None):
    build_id = build_id or time.strftime("%Y%m%d-%H%M%S")
    html = PAGE.read_text()
    html, n = re.subn(
        r'(<script src="js/[a-z]+\.js)(\?v=[^"]*)?(")',
        lambda m: f"{m.group(1)}?v={build_id}{m.group(3)}",
        html,
    )
    PAGE.write_text(html)
    return build_id, n


def strip():
    """Remove the tokens — used before publishing somewhere that serves the
    files by exact path."""
    html = PAGE.read_text()
    html, n = re.subn(r'(<script src="js/[a-z]+\.js)\?v=[^"]*(")', r"\1\2", html)
    PAGE.write_text(html)
    return n


if __name__ == "__main__":
    if "--strip" in sys.argv:
        print(f"stripped {strip()} script tags")
    else:
        bid, count = stamp()
        print(f"stamped {count} script tags with build {bid}")
