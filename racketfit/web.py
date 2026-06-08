"""A tiny, dependency-free web server for RacketFit.

Serves the static front-end and a JSON API, using only the standard library
so ``python -m racketfit.web`` works on any machine with Python 3.10+.

Endpoints
---------
GET  /                 -> the survey app (index.html)
GET  /api/survey       -> the survey questions
GET  /api/rackets      -> the full racket database
POST /api/recommend    -> {profile} -> {ideal, recommendations}
"""

from __future__ import annotations

import json
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from .database import database_meta, load_rackets
from .models import PlayerProfile
from .report import build_report
from .strings import load_strings
from .survey import SURVEY

_STATIC_DIR = Path(__file__).parent / "web_static"

_CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
}


class _Handler(BaseHTTPRequestHandler):
    server_version = "RacketFit"

    # --- helpers -----------------------------------------------------------
    def _send_json(self, payload: Any, status: int = 200) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path: Path) -> None:
        if not path.is_file():
            self._send_json({"error": "not found"}, status=404)
            return
        body = path.read_bytes()
        ctype = _CONTENT_TYPES.get(path.suffix, "application/octet-stream")
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt: str, *args: Any) -> None:  # quieter logging
        return

    # --- routes ------------------------------------------------------------
    def do_GET(self) -> None:
        route = self.path.split("?", 1)[0]

        if route == "/" or route == "/index.html":
            self._send_file(_STATIC_DIR / "index.html")
            return
        if route == "/api/survey":
            self._send_json({"survey": SURVEY})
            return
        if route == "/api/rackets":
            self._send_json(
                {
                    "meta": database_meta(),
                    "rackets": [r.to_dict() for r in load_rackets()],
                }
            )
            return
        if route == "/api/strings":
            self._send_json({"strings": [s.to_dict() for s in load_strings()]})
            return

        # static asset (guarded against path traversal)
        rel = route.lstrip("/")
        target = (_STATIC_DIR / rel).resolve()
        if _STATIC_DIR.resolve() in target.parents and target.is_file():
            self._send_file(target)
            return
        self._send_json({"error": "not found"}, status=404)

    def do_POST(self) -> None:
        route = self.path.split("?", 1)[0]
        if route != "/api/recommend":
            self._send_json({"error": "not found"}, status=404)
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length) if length else b"{}"
            data = json.loads(raw or b"{}")
            profile = PlayerProfile.from_dict(data.get("profile", data))
            top_n = int(data.get("top_n", 5))
            self._send_json(build_report(profile, top_n=top_n))
        except ValueError as exc:
            self._send_json({"error": str(exc)}, status=400)
        except Exception as exc:  # noqa: BLE001 - report cleanly to client
            self._send_json({"error": f"server error: {exc}"}, status=500)


def serve(port: int = 8000, host: str = "127.0.0.1", open_browser: bool = True) -> None:
    """Start the server and (optionally) open a browser tab."""
    httpd = ThreadingHTTPServer((host, port), _Handler)
    url = f"http://{host}:{port}/"
    print(f"\n  RacketFit is running at \033[1m{url}\033[0m")
    print("  Press Ctrl+C to stop.\n")
    if open_browser:
        try:
            webbrowser.open(url)
        except Exception:
            pass
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  Stopped.\n")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    import argparse

    p = argparse.ArgumentParser(description="Run the RacketFit web app.")
    p.add_argument("--port", type=int, default=8000)
    p.add_argument("--host", default="127.0.0.1")
    p.add_argument("--no-browser", action="store_true")
    a = p.parse_args()
    serve(port=a.port, host=a.host, open_browser=not a.no_browser)
