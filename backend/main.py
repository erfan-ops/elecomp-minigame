"""Desktop host for the exhibition kiosk.

Two things run in this one process:

1. A fullscreen pywebview window rendering the built React game. The game
   reports each completed iteration through `window.pywebview.api`.
2. The admin dashboard's HTTP server on http://localhost:8239 (background
   daemon thread), reading and writing the same `GameStore`.

Sharing one process (and therefore one store) is what makes the dashboard
update the instant a game finishes, with no polling and no second copy of the
data. If the dashboard cannot start, the game still runs — the kiosk is the
product, monitoring is not allowed to break it.

This module is wiring only: the record/statistics logic lives in `store.py`,
the HTTP layer in `admin_server.py`.
"""
from pathlib import Path
import argparse
import logging
import sys
import threading

import webview

from admin_server import DEFAULT_HOST, DEFAULT_PORT, start_admin_server
from store import GameStore


def _base_dirs() -> tuple[Path, Path]:
    """(writable dir, bundled-payload dir) — for both source and frozen runs.

    Frozen by PyInstaller, `__file__` points *inside* the bundle
    (`smartis-game/_internal/`), which is the wrong home for `output/` and the
    log: those belong next to the .exe where the operator can find them. So the
    two roles split — the writable dir is the .exe's own folder, the payload dir
    is the bundle. Running from source both are `backend/`.
    """
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent, Path(sys._MEIPASS)
    here = Path(__file__).resolve().parent
    return here, here


def _payload_dir(name: str, marker: str) -> Path:
    """Resolve a bundled asset directory, letting a local copy override it.

    A `frontend/` or `admin/` sitting next to the .exe wins over the bundled
    copy, so a fresh `npm run build` or an edited dashboard page can be dropped
    in without re-running PyInstaller.
    """
    local = BASE_DIR / name
    return local if (local / marker).exists() else BUNDLE_DIR / name


BASE_DIR, BUNDLE_DIR = _base_dirs()
FRONTEND_DIR = _payload_dir("frontend", "index.html")
ADMIN_DIR = _payload_dir("admin", "index.html")
INDEX_FILE = FRONTEND_DIR / "index.html"
OUTPUT_DIR = BASE_DIR / "output"
LOG_FILE = BASE_DIR / "pywebview.log"

# The store and admin_server loggers are children of this one, so they share
# these handlers.
logger = logging.getLogger("smartis-game")
logger.setLevel(logging.INFO)
_FORMAT = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
_handlers: list[logging.Handler] = [logging.FileHandler(LOG_FILE, encoding="utf-8")]
if sys.stderr is not None:
    # A windowed (`-w`) PyInstaller build has no console stream to write to.
    _handlers.append(logging.StreamHandler())
for _handler in _handlers:
    _handler.setFormatter(_FORMAT)
    logger.addHandler(_handler)


class Api:
    """pywebview JS API exposed to the frontend as `window.pywebview.api`.

    Semantic methods only — the frontend can push completed game iterations
    here, nothing else. The backend owns the output directory, the date,
    the sequence numbers, and every filesystem write.

    Naming: pywebview 6 exposes each method under its verbatim Python name
    (no camelCase conversion) — `export_game_result` here is
    `window.pywebview.api.export_game_result` in JavaScript.
    """

    def __init__(self, store: GameStore):
        self.store = store

    def export_game_result(self, data):
        """Persist one completed game iteration and push it to the dashboard.

        Writes two files under `output/`:
        - `game_data_YYYY-MM-DD_NNN.json` — a permanent record of this single
          iteration; NNN is the next unused sequence number for that day. The
          number is reserved with an exclusive create, so concurrent
          iterations can never collide.
        - `game_data_YYYY-MM-DD.json` — a JSON array of **every** iteration
          recorded that day (all users, in sequence order), rebuilt from the
          sequential files and replaced atomically on every export.

        A failure is logged and reported back as `{"success": False}`; it never
        raises into the game.
        """
        mobile = data.get("mobile") if isinstance(data, dict) else None
        attempt = data.get("attempt") if isinstance(data, dict) else None
        game_id = data.get("gameId") if isinstance(data, dict) else None
        logger.info(
            "export_game_result request: mobile=%s attempt=%s gameId=%s",
            mobile, attempt, game_id,
        )
        try:
            return self.store.add_record(data)
        except Exception:
            logger.exception("export_game_result failed")
            return {"success": False}


def check_api_bridge() -> None:
    """Log which JS API methods pywebview actually exposed, for diagnosis."""
    try:
        window = webview.windows[0]
        window.events.loaded.wait(timeout=30)
        methods = window.run_js(
            "window.pywebview && window.pywebview.api"
            " ? Object.keys(window.pywebview.api).join(', ') : 'window.pywebview.api MISSING'"
        )
        logger.info("JS API exposed by pywebview: %s", methods)
    except Exception:
        logger.exception("could not inspect the JS API bridge")


def _parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="smartis-game",
        description="Exhibition kiosk host: game window + admin dashboard.",
    )
    parser.add_argument(
        "--no-window",
        action="store_true",
        help="run only the admin dashboard, without the game window",
    )
    parser.add_argument("--host", default=DEFAULT_HOST, help="admin panel bind address")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="admin panel port")
    parser.add_argument(
        "--no-admin",
        action="store_true",
        help="run only the game window, without the admin dashboard",
    )
    # Unknown arguments are ignored rather than fatal: a mis-typed flag must not
    # stop the kiosk from opening at the venue.
    args, unknown = parser.parse_known_args(argv)
    if unknown:
        logger.warning("ignoring unrecognised arguments: %s", " ".join(unknown))
    return args


def main() -> None:
    args = _parse_args(sys.argv[1:])

    logger.info(
        "starting: frozen=%s frontend=%s admin=%s output=%s",
        getattr(sys, "frozen", False), FRONTEND_DIR, ADMIN_DIR, OUTPUT_DIR,
    )

    store = GameStore(OUTPUT_DIR)
    store.load()

    if not args.no_admin:
        if not (ADMIN_DIR / "index.html").exists():
            logger.error("admin page not found at %s", ADMIN_DIR / "index.html")
        start_admin_server(store, ADMIN_DIR, host=args.host, port=args.port)

    if args.no_window:
        logger.info("running without the game window; Ctrl+C to stop")
        try:
            threading.Event().wait()
        except KeyboardInterrupt:
            logger.info("stopped")
        return

    if not INDEX_FILE.exists():
        logger.error(
            "frontend index not found at %s - run `npm run build` and sync dist/ first",
            INDEX_FILE,
        )

    webview.create_window(
        title="Exhibition Game",
        url=str(INDEX_FILE),
        width=1280,
        height=720,
        fullscreen=True,
        js_api=Api(store),
    )

    webview.start(func=check_api_bridge)


if __name__ == "__main__":
    main()
