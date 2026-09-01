"""Durable game-record store, derived statistics, and change notifications.

This is the single owner of the kiosk's on-disk game data. The files it writes
are exactly the ones the host wrote before the admin panel existed, so nothing
about the operator's deliverables changed:

    output/game_data_YYYY-MM-DD_NNN.json   one completed iteration, permanent
    output/game_data_YYYY-MM-DD.json       every iteration of that day, an array

Those sequential files ARE the database. They are append-only, created with an
exclusive open (so two iterations can never take the same number), and never
rewritten — which makes them safe to treat as the source of truth. On startup
the store scans every one of them, so history survives a restart of the game,
of the admin panel, or of the whole machine, and every statistic the dashboard
shows can be recomputed from disk alone.

Everything here is thread-safe: the pywebview JS bridge, the admin HTTP server,
and the SSE broadcaster all touch one `GameStore` from different threads.

No React, no HTTP, no pywebview — this module only knows about records.
"""
from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any
import csv
import io
import json
import logging
import math
import os
import queue
import re
import threading

logger = logging.getLogger("smartis-game.store")

EXPORT_PREFIX = "game_data"
DATE_FORMAT = "%Y-%m-%d"
SEQUENCE_WIDTH = 3  # game_data_2026-08-29_001.json

SEQUENCE_PATTERN = re.compile(
    rf"^{EXPORT_PREFIX}_(\d{{4}}-\d{{2}}-\d{{2}})_(\d+)$"
)

# The organizer's prize pool, in Toman. MUST match `BUDGET` in
# frontend/src/games/number-wheel/config.ts — that constant drives the game's
# difficulty scaling, this one drives the dashboard's consumption panel.
PRIZE_POOL_TOTAL = 100_000_000

# How many records the admin table/dashboard may hold at once. Far above a
# realistic exhibition (a few hundred players), it only exists so a corrupt
# output directory cannot exhaust memory.
MAX_RECORDS = 100_000

# A subscriber that falls this far behind is dropped; its EventSource
# reconnects on its own and receives a fresh snapshot.
SUBSCRIBER_QUEUE_LIMIT = 500


# --------------------------------------------------------------------------- #
#  Normalisation — never trust a record, it crosses a JS bridge or comes from
#  a file an operator may have edited.
# --------------------------------------------------------------------------- #

def _as_str(value: Any, default: str = "") -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return str(value)
    return default


def _as_int(value: Any, default: int = 0) -> int:
    parsed = _as_optional_int(value)
    return default if parsed is None else parsed


def _as_optional_int(value: Any) -> int | None:
    """Coerce to int, or None when the value is absent/unparsable.

    `bool` is rejected explicitly because it is an `int` subclass in Python and
    `hasBenefits`-style flags must never become 0/1 numbers here.
    """
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value) if math.isfinite(value) else None
    if isinstance(value, str):
        try:
            return int(float(value.strip()))
        except (ValueError, TypeError):
            return None
    return None


def normalize_record(raw: Any) -> dict[str, Any] | None:
    """One stored iteration, flattened and type-coerced for the dashboard.

    `metadata` is game-specific (the number-wheel game puts `target`,
    `finalNumber`, `correctDigits` and `perfect` there); the useful keys are
    lifted to the top level so the table and the CSV stay flat, and the whole
    original object is kept under `metadata` so nothing is lost.

    Returns None for anything that is not a JSON object.
    """
    if not isinstance(raw, dict):
        return None
    metadata = raw.get("metadata")
    if not isinstance(metadata, dict):
        metadata = {}

    record = {
        "userId": _as_str(raw.get("userId")),
        "mobile": _as_str(raw.get("mobile")),
        "employeeCount": _as_int(raw.get("employeeCount")),
        "hasBenefits": bool(raw.get("hasBenefits")),
        "attempt": _as_int(raw.get("attempt"), 1),
        "sectorId": _as_str(raw.get("sectorId")),
        "sectorName": _as_str(raw.get("sectorName")),
        "gameId": _as_str(raw.get("gameId")),
        "score": _as_int(raw.get("score")),
        "winAmount": _as_int(raw.get("winAmount")),
        "playedAt": _as_str(raw.get("playedAt")),
        "target": _as_optional_int(metadata.get("target")),
        "finalNumber": _as_optional_int(metadata.get("finalNumber")),
        "correctDigits": _as_optional_int(metadata.get("correctDigits")),
        "perfect": bool(metadata.get("perfect")),
        "metadata": metadata,
    }
    record["playerKey"] = record["mobile"] or record["userId"]
    record["id"] = _record_id(record)
    return record


def _record_id(record: dict[str, Any]) -> str:
    """Identity of one game iteration — used to reject duplicates.

    A player is identified by their mobile, an iteration by its attempt
    number, and the timestamp disambiguates the (blocked, but possible)
    case of the same mobile playing a whole second session.
    """
    return f"{record['playerKey']}|{record['attempt']}|{record['playedAt']}"


# --------------------------------------------------------------------------- #
#  Store
# --------------------------------------------------------------------------- #

class GameStore:
    """Thread-safe view over the on-disk game records, plus a pub/sub channel."""

    def __init__(self, output_dir: Path, prize_pool: int = PRIZE_POOL_TOTAL):
        self.output_dir = Path(output_dir)
        self.prize_pool = prize_pool
        self._lock = threading.RLock()
        self._records: list[dict[str, Any]] = []
        self._ids: set[str] = set()
        self._subscribers: list[queue.Queue] = []

    # -- loading ----------------------------------------------------------- #

    def load(self) -> int:
        """Read every sequential export file into memory. Returns the count.

        Called once at startup. An unreadable or non-object file is logged and
        skipped rather than aborting the load — one bad file must not hide a
        whole exhibition's data.
        """
        records: list[dict[str, Any]] = []
        ids: set[str] = set()
        skipped = 0

        for _date_str, _sequence, path in self._all_sequence_files():
            try:
                with open(path, encoding="utf-8") as f:
                    raw = json.load(f)
            except (OSError, json.JSONDecodeError):
                logger.exception("skipping unreadable record file %s", path)
                skipped += 1
                continue
            record = normalize_record(raw)
            if record is None:
                logger.warning("skipping non-object record file %s", path)
                skipped += 1
                continue
            if record["id"] in ids:
                # Same iteration written twice (e.g. a file restored by hand).
                skipped += 1
                continue
            record["sourceFile"] = path.name
            records.append(record)
            ids.add(record["id"])

        with self._lock:
            self._records = records[-MAX_RECORDS:]
            self._ids = {r["id"] for r in self._records}

        logger.info(
            "store loaded %s record(s) from %s (%s file(s) skipped)",
            len(records), self.output_dir, skipped,
        )
        return len(records)

    def _all_sequence_files(self) -> list[tuple[str, int, Path]]:
        """Every `game_data_<date>_<NNN>.json`, ordered by date then sequence."""
        found: list[tuple[str, int, Path]] = []
        if not self.output_dir.exists():
            return found
        for path in self.output_dir.glob(f"{EXPORT_PREFIX}_*.json"):
            match = SEQUENCE_PATTERN.match(path.stem)
            if match:
                found.append((match.group(1), int(match.group(2)), path))
        return sorted(found, key=lambda item: (item[0], item[1]))

    def _sequence_files_for(self, date_str: str) -> list[tuple[int, Path]]:
        return [
            (sequence, path)
            for day, sequence, path in self._all_sequence_files()
            if day == date_str
        ]

    # -- writing ----------------------------------------------------------- #

    def add_record(self, raw: Any) -> dict[str, Any]:
        """Persist one completed iteration and notify the dashboard.

        The whole operation is serialised on the store lock, so two players
        finishing at the same instant cannot take the same sequence number,
        interleave the daily-file rebuild, or race the in-memory list.

        Returns a result dict for the caller to hand back to JavaScript.
        """
        record = normalize_record(raw)
        if record is None:
            logger.error("rejected a record that is not a JSON object: %r", type(raw))
            return {"success": False, "error": "record must be an object"}

        with self._lock:
            if record["id"] in self._ids:
                # Both transports fired, or a client retried. Persisting again
                # would double-count the prize, so acknowledge and do nothing.
                logger.info("duplicate record ignored: %s", record["id"])
                return {"success": True, "duplicate": True, "dailyCount": len(self._records)}

            self.output_dir.mkdir(parents=True, exist_ok=True)
            today = datetime.now().strftime(DATE_FORMAT)

            sequence_path = self._write_sequence_file(today, raw)

            daily_path = self.output_dir / f"{EXPORT_PREFIX}_{today}.json"
            daily_records = self._collect_daily_raw(today)
            _replace_json_atomic(daily_path, daily_records)

            record["sourceFile"] = sequence_path.name
            self._records.append(record)
            self._ids.add(record["id"])
            if len(self._records) > MAX_RECORDS:
                dropped = self._records.pop(0)
                self._ids.discard(dropped["id"])

            stats = self._compute_stats()

        logger.info(
            "record stored: %s and %s (%s iteration(s) today, %s total)",
            sequence_path, daily_path, len(daily_records), len(self._records),
        )
        self._broadcast("record", {"record": record, "stats": stats})
        return {
            "success": True,
            "sequenceFile": str(sequence_path),
            "dailyFile": str(daily_path),
            "dailyCount": len(daily_records),
        }

    def _write_sequence_file(self, date_str: str, raw: Any) -> Path:
        """Claim the next free sequence number for `date_str` and write to it.

        The exclusive create ("x") is the claim: if the file already exists the
        number is taken, so we move on. Belt and braces alongside the lock —
        it also protects against a second process (a stray .exe) writing here.
        """
        existing = self._sequence_files_for(date_str)
        sequence = (existing[-1][0] if existing else 0) + 1
        while True:
            path = self.output_dir / (
                f"{EXPORT_PREFIX}_{date_str}_{sequence:0{SEQUENCE_WIDTH}d}.json"
            )
            try:
                with open(path, "x", encoding="utf-8") as f:
                    json.dump(raw, f, ensure_ascii=False, indent=4)
                return path
            except FileExistsError:
                sequence += 1

    def _collect_daily_raw(self, date_str: str) -> list[Any]:
        """Every raw iteration recorded on `date_str`, in sequence order.

        Rebuilt from the permanent files rather than appended to the previous
        daily file, so the daily array is always consistent with them and
        self-heals if it is deleted or corrupted.
        """
        records: list[Any] = []
        for sequence, path in self._sequence_files_for(date_str):
            try:
                with open(path, encoding="utf-8") as f:
                    records.append(json.load(f))
            except (OSError, json.JSONDecodeError):
                logger.exception(
                    "skipping unreadable export file %s (sequence %s)", path, sequence
                )
        return records

    # -- reading ----------------------------------------------------------- #

    def records(self) -> list[dict[str, Any]]:
        with self._lock:
            return list(self._records)

    def stats(self) -> dict[str, Any]:
        with self._lock:
            return self._compute_stats()

    def snapshot(self) -> dict[str, Any]:
        """Everything the dashboard needs in one payload."""
        with self._lock:
            return {
                "generatedAt": datetime.now().astimezone().isoformat(),
                "records": list(self._records),
                "stats": self._compute_stats(),
            }

    def _compute_stats(self) -> dict[str, Any]:
        """Derive every dashboard number from the records. Caller holds the lock.

        Recomputed on demand rather than maintained incrementally: at
        exhibition scale it is microseconds, and it can never drift out of
        sync with the stored records.
        """
        records = self._records
        today = datetime.now().strftime(DATE_FORMAT)

        players: set[str] = set()
        winning_players: set[str] = set()
        players_by_digits: dict[int, set[str]] = {1: set(), 2: set(), 3: set()}
        games_by_digits: dict[int, int] = {0: 0, 1: 0, 2: 0, 3: 0}
        benefits_players: dict[str, set[str]] = {"yes": set(), "no": set()}
        headcount_players: dict[int, set[str]] = {}
        sectors: dict[str, dict[str, Any]] = {}

        consumed = 0
        winning_games = 0
        perfect_games = 0
        today_games = 0
        today_consumed = 0
        today_players: set[str] = set()
        biggest: dict[str, Any] | None = None
        last_played = ""

        for record in records:
            key = record["playerKey"]
            amount = record["winAmount"]
            digits = record["correctDigits"]

            players.add(key)
            consumed += amount
            if record["playedAt"] > last_played:
                last_played = record["playedAt"]

            if amount > 0:
                winning_games += 1
                winning_players.add(key)
                if biggest is None or amount > biggest["winAmount"]:
                    biggest = {
                        "winAmount": amount,
                        "mobile": record["mobile"],
                        "playedAt": record["playedAt"],
                        "correctDigits": digits,
                    }

            if isinstance(digits, int) and 0 <= digits <= 3:
                games_by_digits[digits] += 1
                if digits >= 1 and amount > 0:
                    players_by_digits[digits].add(key)
            if record["perfect"]:
                perfect_games += 1

            benefits_players["yes" if record["hasBenefits"] else "no"].add(key)
            headcount_players.setdefault(record["employeeCount"], set()).add(key)

            sector = sectors.setdefault(
                record["sectorId"] or record["sectorName"] or "unknown",
                {
                    "sectorId": record["sectorId"],
                    "sectorName": record["sectorName"] or "—",
                    "games": 0,
                    "players": set(),
                    "prize": 0,
                },
            )
            sector["games"] += 1
            sector["players"].add(key)
            sector["prize"] += amount

            if record["playedAt"][:10] == today:
                today_games += 1
                today_consumed += amount
                today_players.add(key)

        player_count = len(players)
        remaining = max(0, self.prize_pool - consumed)
        consumed_percent = (consumed / self.prize_pool * 100) if self.prize_pool else 0.0

        return {
            "prizePool": {
                "total": self.prize_pool,
                "consumed": consumed,
                "remaining": remaining,
                "consumedPercent": round(consumed_percent, 2),
                "overspent": max(0, consumed - self.prize_pool),
            },
            "players": player_count,
            "games": len(records),
            "retryGames": max(0, len(records) - player_count),
            "averageAttempts": round(len(records) / player_count, 2) if player_count else 0,
            "winners": len(winning_players),
            "winningGames": winning_games,
            "losingGames": len(records) - winning_games,
            "winRatePercent": round(len(winning_players) / player_count * 100, 1) if player_count else 0.0,
            "perfectGames": perfect_games,
            # Distinct players per exact-match count — the same definition the
            # kiosk's own «آمار مسابقه» panel uses, so the two agree.
            "winnersByCorrectDigits": {
                "1": len(players_by_digits[1]),
                "2": len(players_by_digits[2]),
                "3": len(players_by_digits[3]),
            },
            "gamesByCorrectDigits": {str(k): v for k, v in games_by_digits.items()},
            "benefits": {
                "yes": len(benefits_players["yes"]),
                "no": len(benefits_players["no"]),
            },
            "headcounts": [
                {"employeeCount": count, "players": len(keys)}
                for count, keys in sorted(headcount_players.items())
            ],
            "sectors": sorted(
                (
                    {
                        "sectorId": s["sectorId"],
                        "sectorName": s["sectorName"],
                        "games": s["games"],
                        "players": len(s["players"]),
                        "prize": s["prize"],
                    }
                    for s in sectors.values()
                ),
                key=lambda s: (-s["games"], s["sectorName"]),
            ),
            "today": {
                "date": today,
                "games": today_games,
                "players": len(today_players),
                "prize": today_consumed,
            },
            "biggestWin": biggest,
            "lastPlayedAt": last_played or None,
        }

    # -- CSV --------------------------------------------------------------- #

    CSV_COLUMNS: list[tuple[str, str]] = [
        ("playedAt", "Played At (ISO)"),
        ("playedAtLocal", "Played At (local)"),
        ("mobile", "Mobile"),
        ("sectorName", "Category"),
        ("sectorId", "Category ID"),
        ("attempt", "Try #"),
        ("employeeCount", "Employee Count"),
        ("hasBenefitsText", "Has Benefits"),
        ("target", "Target Number"),
        ("finalNumber", "Final Number"),
        ("correctDigits", "Correct Digits"),
        ("perfectText", "Perfect"),
        ("winAmount", "Won Amount (Toman)"),
        ("score", "Score"),
        ("gameId", "Game"),
        ("userId", "User ID"),
        ("sourceFile", "Source File"),
    ]

    def csv_bytes(self) -> bytes:
        """All stored records as spreadsheet-ready CSV (never just one page).

        UTF-8 **with a BOM** and CRLF line endings: that is what makes Excel
        open the Persian category names correctly instead of mojibake.
        """
        records = self.records()
        buffer = io.StringIO(newline="")
        writer = csv.writer(buffer, lineterminator="\r\n")
        writer.writerow([label for _key, label in self.CSV_COLUMNS])
        for record in records:
            row = dict(record)
            row["playedAtLocal"] = _local_time_text(record["playedAt"])
            row["hasBenefitsText"] = "yes" if record["hasBenefits"] else "no"
            row["perfectText"] = "yes" if record["perfect"] else "no"
            writer.writerow(
                ["" if row.get(key) is None else row.get(key, "") for key, _label in self.CSV_COLUMNS]
            )
        return b"\xef\xbb\xbf" + buffer.getvalue().encode("utf-8")

    # -- pub/sub ----------------------------------------------------------- #

    def subscribe(self) -> queue.Queue:
        q: queue.Queue = queue.Queue(maxsize=SUBSCRIBER_QUEUE_LIMIT)
        with self._lock:
            self._subscribers.append(q)
            count = len(self._subscribers)
        logger.info("admin subscriber connected (%s active)", count)
        return q

    def unsubscribe(self, q: queue.Queue) -> None:
        with self._lock:
            if q in self._subscribers:
                self._subscribers.remove(q)
            count = len(self._subscribers)
        logger.info("admin subscriber disconnected (%s active)", count)

    def _broadcast(self, event: str, data: Any) -> None:
        """Fan one event out to every connected dashboard.

        A subscriber whose queue is full is dropped: it is not reading, and its
        EventSource will reconnect and pull a fresh snapshot. Broadcasting must
        never block the player-facing write path.
        """
        message = (event, data)
        with self._lock:
            subscribers = list(self._subscribers)
        for q in subscribers:
            try:
                q.put_nowait(message)
            except queue.Full:
                logger.warning("dropping a slow admin subscriber")
                self.unsubscribe(q)


# --------------------------------------------------------------------------- #
#  File helpers
# --------------------------------------------------------------------------- #

def _write_json(path: Path, data: Any) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


def _replace_json_atomic(path: Path, data: Any) -> None:
    """Write to a temp file in the same directory, then swap it in.

    Keeps the daily file either fully old or fully new — never a half-written
    JSON document — even if the process dies mid-write.
    """
    tmp_path = path.with_name(path.name + ".tmp")
    _write_json(tmp_path, data)
    os.replace(tmp_path, path)


def _local_time_text(iso: str) -> str:
    """`2026-09-01T12:34:56.789Z` → `2026-09-01 16:04:56` in kiosk local time."""
    if not iso:
        return ""
    try:
        parsed = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        return iso
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone()
    return parsed.strftime("%Y-%m-%d %H:%M:%S")
