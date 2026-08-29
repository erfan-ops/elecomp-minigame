from datetime import datetime
from pathlib import Path
import json
import logging
import os

import webview


BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "frontend"
INDEX_FILE = FRONTEND_DIR / "index.html"
OUTPUT_DIR = BASE_DIR / "output"
LOG_FILE = BASE_DIR / "pywebview.log"

EXPORT_PREFIX = "game_data"
DATE_FORMAT = "%Y-%m-%d"
SEQUENCE_WIDTH = 3  # game_data_2026-08-29_001.json

logger = logging.getLogger("smartis-game")
logger.setLevel(logging.INFO)
_FORMAT = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
for _handler in (logging.StreamHandler(), logging.FileHandler(LOG_FILE, encoding="utf-8")):
    _handler.setFormatter(_FORMAT)
    logger.addHandler(_handler)


def _latest_sequence(output_dir: Path, date_str: str) -> int:
    """The highest NNN used by date_str's sequential files (0 when none exist)."""
    prefix = f"{EXPORT_PREFIX}_{date_str}_"
    highest = 0
    for path in output_dir.glob(f"{EXPORT_PREFIX}_{date_str}_*.json"):
        suffix = path.stem[len(prefix):]
        if suffix.isdigit():
            highest = max(highest, int(suffix))
    return highest


def _write_json(path: Path, data) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


def _replace_json_atomic(path: Path, data) -> None:
    """Write to a temp file in the same directory, then swap it in.

    Keeps the daily file either fully old or fully new — never a half-written
    JSON document — even if the process dies mid-write.
    """
    tmp_path = path.with_name(path.name + ".tmp")
    _write_json(tmp_path, data)
    os.replace(tmp_path, path)


class Api:
    """pywebview JS API exposed to the frontend as `window.pywebview.api`.

    Semantic methods only — the frontend can push completed game iterations
    here, nothing else. The backend owns the output directory, the date,
    the sequence numbers, and every filesystem write.

    Naming: pywebview 6 exposes each method under its verbatim Python name
    (no camelCase conversion) — `export_game_result` here is
    `window.pywebview.api.export_game_result` in JavaScript.
    """

    def __init__(self, output_dir: Path = OUTPUT_DIR):
        self.output_dir = output_dir

    def export_game_result(self, data):
        """Persist one completed game iteration to disk.

        Writes two files under `output/`:
        - `game_data_YYYY-MM-DD_NNN.json` — a permanent record; NNN is the
          next unused sequence number for that day. The number is reserved
          with an exclusive create, so concurrent iterations can never
          collide.
        - `game_data_YYYY-MM-DD.json` — the latest iteration of the day,
          replaced atomically on every export.
        """
        logger.info(
            "export_game_result request: mobile=%s attempt=%s gameId=%s",
            data.get("mobile"), data.get("attempt"), data.get("gameId"),
        )
        try:
            self.output_dir.mkdir(parents=True, exist_ok=True)
            today = datetime.now().strftime(DATE_FORMAT)

            sequence = _latest_sequence(self.output_dir, today) + 1
            while True:
                sequence_path = self.output_dir / (
                    f"{EXPORT_PREFIX}_{today}_{sequence:0{SEQUENCE_WIDTH}d}.json"
                )
                try:
                    with open(sequence_path, "x", encoding="utf-8") as f:
                        json.dump(data, f, ensure_ascii=False, indent=4)
                    break
                except FileExistsError:
                    sequence += 1

            daily_path = self.output_dir / f"{EXPORT_PREFIX}_{today}.json"
            _replace_json_atomic(daily_path, data)

            logger.info(
                "export_game_result written: %s and %s",
                sequence_path, daily_path,
            )
            return {
                "success": True,
                "sequenceFile": str(sequence_path),
                "dailyFile": str(daily_path),
            }
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


def main():
    if not INDEX_FILE.exists():
        logger.error("frontend index not found at %s — run `npm run build` and sync dist/ first", INDEX_FILE)

    webview.create_window(
        title="Exhibition Game",
        url=str(INDEX_FILE),
        width=1280,
        height=720,
        fullscreen=True,
        js_api=Api(),
    )

    webview.start(func=check_api_bridge)


if __name__ == "__main__":
    main()
