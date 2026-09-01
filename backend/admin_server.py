"""The admin dashboard's HTTP server: static page, JSON API, SSE, CSV export.

Deliberately stdlib-only (`http.server`). A framework would add a dependency to
a PyInstaller bundle that currently needs none, for a server that handles one
operator on one machine.

Runs on a daemon thread inside the same process as the pywebview kiosk window,
so it shares one `GameStore` — a completed game reaches the dashboard through an
in-memory queue, with no polling and no second copy of the data.

Endpoints (all under http://localhost:8239):

    GET  /                  the dashboard page
    GET  /api/state         full snapshot: every record + every statistic
    GET  /api/events        Server-Sent Events: a snapshot, then one event per game
    GET  /api/export.csv    every stored record as CSV (Excel-safe UTF-8 BOM)
    POST /api/results       ingest one completed game (fallback for browser mode)

The dashboard never mutates game state; `POST /api/results` exists only so the
frontend can persist results when the pywebview JS bridge is absent (dev server,
Docker/nginx). Duplicates are rejected by `GameStore`, so it is safe for both
transports to fire.
"""
from __future__ import annotations

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
import json
import logging
import mimetypes
import queue
import threading

from store import GameStore

logger = logging.getLogger("smartis-game.admin")

DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = 8239

# Longest a streaming connection waits for a game before it emits a comment
# heartbeat. The heartbeat is what makes a dead connection detectable (and
# keeps intermediaries from timing the stream out).
HEARTBEAT_SECONDS = 15

# A completed game record is a few hundred bytes; this only stops a runaway
# client from streaming an unbounded body into memory.
MAX_BODY_BYTES = 256 * 1024


class AdminRequestHandler(BaseHTTPRequestHandler):
    """One request. `store` and `admin_dir` are attached to the server object."""

    protocol_version = "HTTP/1.1"
    server_version = "SmartisGameAdmin/1.0"

    # ---- plumbing -------------------------------------------------------- #

    @property
    def store(self) -> GameStore:
        return self.server.store  # type: ignore[attr-defined]

    @property
    def admin_dir(self) -> Path:
        return self.server.admin_dir  # type: ignore[attr-defined]

    def log_message(self, format: str, *args: Any) -> None:
        """Route access logs to our logger.

        Not cosmetic: the default implementation writes to `sys.stderr`, which
        is None in a windowed PyInstaller build — every request would raise.
        """
        logger.debug("%s - %s", self.address_string(), format % args)

    def _send(
        self,
        status: int,
        body: bytes,
        content_type: str,
        extra_headers: dict[str, str] | None = None,
    ) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        # The dashboard is same-origin, but the game page may be served from
        # the Vite dev server or nginx on another port and POST results here.
        self.send_header("Access-Control-Allow-Origin", "*")
        for name, value in (extra_headers or {}).items():
            self.send_header(name, value)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _send_json(self, status: int, payload: Any) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self._send(status, body, "application/json; charset=utf-8")

    # ---- routing --------------------------------------------------------- #

    def do_OPTIONS(self) -> None:  # noqa: N802 - http.server naming
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_HEAD(self) -> None:  # noqa: N802
        self.do_GET()

    def do_GET(self) -> None:  # noqa: N802
        path = self.path.split("?", 1)[0].rstrip("/") or "/"
        try:
            if path in ("/", "/index.html", "/admin"):
                self._serve_file("index.html")
            elif path == "/api/state":
                self._send_json(200, self.store.snapshot())
            elif path == "/api/events":
                self._stream_events()
            elif path == "/api/export.csv":
                self._serve_csv()
            elif path == "/api/health":
                self._send_json(200, {"ok": True, "records": len(self.store.records())})
            else:
                self._serve_file(path.lstrip("/"))
        except (BrokenPipeError, ConnectionResetError):
            # The operator closed the tab or reloaded mid-response.
            logger.debug("client disconnected during %s", path)
        except Exception:
            logger.exception("admin GET %s failed", path)
            self._safe_error(500, "internal error")

    def do_POST(self) -> None:  # noqa: N802
        path = self.path.split("?", 1)[0].rstrip("/") or "/"
        if path != "/api/results":
            self._send_json(404, {"success": False, "error": "not found"})
            return
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            self._send_json(400, {"success": False, "error": "bad content length"})
            return
        if length <= 0 or length > MAX_BODY_BYTES:
            self._send_json(400, {"success": False, "error": "bad body size"})
            return
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._send_json(400, {"success": False, "error": "body must be JSON"})
            return
        try:
            result = self.store.add_record(payload)
        except Exception:
            logger.exception("admin ingest failed")
            self._send_json(500, {"success": False, "error": "write failed"})
            return
        self._send_json(200 if result.get("success") else 400, result)

    # ---- handlers -------------------------------------------------------- #

    def _serve_file(self, relative: str) -> None:
        """Serve a file from the admin directory, refusing to escape it."""
        target = (self.admin_dir / relative).resolve()
        try:
            target.relative_to(self.admin_dir.resolve())
        except ValueError:
            self._send_json(403, {"error": "forbidden"})
            return
        if not target.is_file():
            self._send_json(404, {"error": "not found"})
            return
        content_type = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        if content_type.startswith("text/") or content_type == "application/javascript":
            content_type += "; charset=utf-8"
        self._send(200, target.read_bytes(), content_type)

    def _serve_csv(self) -> None:
        body = self.store.csv_bytes()
        self._send(
            200,
            body,
            "text/csv; charset=utf-8",
            {"Content-Disposition": 'attachment; filename="smartis-game-results.csv"'},
        )

    def _stream_events(self) -> None:
        """Server-Sent Events: the live channel the dashboard listens on.

        The first message is always a complete snapshot, so a reconnecting
        client needs no event replay, no cursor, and no missed-event
        bookkeeping — `EventSource` reconnects on its own and immediately has
        correct state again. That is what makes this reliable for a whole day
        of exhibition without polling.

        No Content-Length is possible on an open-ended stream, so the response
        is explicitly `Connection: close` — the body then legitimately ends
        when the connection does.
        """
        subscription = self.store.subscribe()
        self.close_connection = True
        try:
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Cache-Control", "no-cache, no-transform")
            self.send_header("Connection", "close")
            self.send_header("Access-Control-Allow-Origin", "*")
            # Tells any reverse proxy in front of us not to buffer the stream.
            self.send_header("X-Accel-Buffering", "no")
            self.end_headers()

            self._write_event("snapshot", self.store.snapshot())
            while True:
                try:
                    event, data = subscription.get(timeout=HEARTBEAT_SECONDS)
                except queue.Empty:
                    self.wfile.write(b": ping\n\n")
                    self.wfile.flush()
                    continue
                self._write_event(event, data)
        except (BrokenPipeError, ConnectionResetError, OSError):
            logger.debug("event stream closed by client")
        finally:
            self.store.unsubscribe(subscription)

    def _write_event(self, event: str, data: Any) -> None:
        payload = json.dumps(data, ensure_ascii=False)
        self.wfile.write(f"event: {event}\ndata: {payload}\n\n".encode("utf-8"))
        self.wfile.flush()

    def _safe_error(self, status: int, message: str) -> None:
        """Send an error, tolerating a connection that is already gone."""
        try:
            self._send_json(status, {"error": message})
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass


class AdminServer(ThreadingHTTPServer):
    daemon_threads = True  # never block process exit on an open SSE stream
    allow_reuse_address = True

    def __init__(self, address: tuple[str, int], store: GameStore, admin_dir: Path):
        self.store = store
        self.admin_dir = Path(admin_dir)
        super().__init__(address, AdminRequestHandler)


def start_admin_server(
    store: GameStore,
    admin_dir: Path,
    host: str = DEFAULT_HOST,
    port: int = DEFAULT_PORT,
) -> AdminServer | None:
    """Start the dashboard on a background daemon thread.

    Returns None if it could not start (port already taken, for example).
    A failure here MUST NOT stop the game: the kiosk is the product, the
    dashboard is monitoring. Every failure is logged instead of raised.
    """
    try:
        server = AdminServer((host, port), store, admin_dir)
    except OSError:
        logger.exception(
            "admin panel could not bind %s:%s - the game continues without it "
            "(is another instance already running?)",
            host, port,
        )
        return None

    thread = threading.Thread(
        target=server.serve_forever,
        name="admin-http",
        daemon=True,
    )
    thread.start()
    logger.info("admin panel listening on http://%s:%s (serving %s)", host, port, admin_dir)
    return server
