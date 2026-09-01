# DOC_ID: AI-13_ADMIN_PANEL
# SCOPE: The admin dashboard subsystem — store, HTTP server, page, live channel, CSV, ingest transports
# STATUS: VERIFIED
# PRIMARY_SOURCE_PATHS:
# - <repo-root>/backend/store.py
# - <repo-root>/backend/admin_server.py
# - <repo-root>/backend/admin/index.html
# - <repo-root>/backend/main.py
# - src/services/gameExporter.ts
# - <repo-root>/build.ps1

## What It Is

A **separate monitoring interface** for the organizer, served at **`http://localhost:8239`** by the
Python host. It is not part of the React kiosk app: different process boundary (a stdlib HTTP server
instead of the pywebview window), different page, different stylesheet, different language of
implementation. Nothing in `frontend/src/` imports it, renders it, or links to it.

| Property | Value |
|---|---|
| URL | `http://localhost:8239` (also `/admin`, `/index.html`); LAN-reachable at `http://<kiosk-ip>:8239` |
| Served by | `<repo-root>/backend/admin_server.py` (`http.server.ThreadingHTTPServer`) |
| Page | `<repo-root>/backend/admin/index.html` — one self-contained file |
| Runtime dependencies | **None.** Python stdlib on the server, vanilla JS + native `EventSource` in the page |
| Lifecycle | A daemon thread inside the same process as the kiosk window (`main.py`) |
| Bind | `0.0.0.0` by default (`DEFAULT_HOST`), so any device on the same LAN can open it — **no authentication** (see `12_KNOWN_GAPS_AND_RISKS.md` E7); pass `--host 127.0.0.1` for loopback only |
| Data source | `backend/output/game_data_<date>_NNN.json` — the same files the host already wrote |

**Hard rule:** the dashboard is monitoring, the kiosk is the product. Every failure path in this
subsystem degrades to "the game keeps working": a port clash logs and skips the panel
(`start_admin_server` returns `None`), an ingest failure is swallowed by the exporter, a slow
dashboard is disconnected rather than allowed to block a write.

## Process Layout

```
one process (backend/main.py)
├── main thread ........ pywebview fullscreen window → backend/frontend/index.html
│                        js_api = Api(store)
├── admin-http thread .. ThreadingHTTPServer on 0.0.0.0:8239  (daemon)
└── shared ............. one GameStore  ← the reason updates are instant
```

Both halves hold the *same* `GameStore` object, so a finished game is already in the dashboard's
data structure by the time the JS bridge call returns. There is no second copy of the data, no
inter-process channel, and nothing to poll.

## The Store (`backend/store.py`)

`GameStore` is the single owner of the on-disk game data and the only thing that writes to
`backend/output/`.

| Concern | Mechanism |
|---|---|
| Persistence | The sequential export files **are** the database: append-only, one per completed iteration, never rewritten. `load()` scans every `game_data_<date>_NNN.json` across all dates at startup, so restarting the game, the panel, or the machine loses nothing |
| Daily array | `game_data_<date>.json` is **rebuilt from the sequential files** on every export and swapped in with `os.replace` — never half-written, and it self-heals if deleted or corrupted |
| Concurrency | One `threading.RLock` serialises the whole of `add_record` (dedup check → file write → daily rebuild → in-memory append → stats). The sequence number is *additionally* claimed with an exclusive `open(path, "x")`, so even a second process cannot collide |
| Deduplication | Record identity is `playerKey|attempt|playedAt` (`_record_id`), where `playerKey` is `mobile or userId`. A repeat is acknowledged (`{"success": true, "duplicate": true}`) and **not** persisted — this is what makes it safe for both ingest transports to fire |
| Validation | `normalize_record` type-coerces every field and returns `None` for a non-object. `bool` is rejected inside `_as_optional_int` because it is an `int` subclass in Python |
| Statistics | `_compute_stats()` recomputes everything from the records on demand — microseconds at exhibition scale, and it can never drift out of sync with what is stored |
| Memory bound | `MAX_RECORDS = 100_000` (far above a realistic exhibition; it only stops a corrupt output directory from exhausting memory) |
| Live channel | `subscribe()` / `unsubscribe()` / `_broadcast()` over `queue.Queue(maxsize=500)`. A subscriber whose queue fills is dropped — its `EventSource` reconnects and pulls a fresh snapshot |

### Normalized Record Shape

`metadata` is game-specific; the useful number-wheel keys are lifted to the top level so the table
and the CSV stay flat, and the **whole original object is kept** under `metadata` so nothing is lost.

| Field | Source | Notes |
|---|---|---|
| `userId`, `mobile` | `GameSessionResult` | `mobile` is the full 11-digit 09-form, exactly as entered |
| `employeeCount`, `hasBenefits` | survey answers | `employeeCount: 0` means «شاغل نیست» |
| `attempt` | host adapter | Defaults to `1` |
| `sectorId`, `sectorName` | category selection | |
| `gameId`, `score`, `winAmount`, `playedAt` | game result | `winAmount` in Toman; `playedAt` ISO |
| `target`, `finalNumber`, `correctDigits` | `metadata.*` | `int | None` |
| `perfect` | `metadata.perfect` | Boolean — **all three digits matched** (`prizeCalculator`). It has nothing to do with the `PERFECT_MOBILES` assist, which is never recorded anywhere |
| `metadata` | verbatim | The original object |
| `playerKey` | derived | `mobile or userId` — the identity used for "distinct players" |
| `id` | derived | `playerKey|attempt|playedAt` |
| `sourceFile` | derived | The `game_data_*.json` this record came from |

### Statistics Shape (`stats`)

| Key | Meaning |
|---|---|
| `prizePool` | `{ total, consumed, remaining, consumedPercent, overspent }`. `consumed` is `sum(winAmount)` over the durable disk records — **not** the browser's `smartis-game.budget.v1` key |
| `players` | Distinct `playerKey` count |
| `games`, `retryGames`, `averageAttempts` | Total iterations; iterations beyond one per player; games ÷ players |
| `winners`, `winningGames`, `losingGames`, `winRatePercent` | Distinct winning players and per-game counts |
| `winnersByCorrectDigits` | `{ "1", "2", "3" }` — **distinct players**, the same definition the kiosk's own «آمار مسابقه» panel uses, so the two screens agree |
| `gamesByCorrectDigits` | `{ "0".."3" }` — per-**game** counts |
| `perfectGames` | Iterations whose `metadata.perfect` is set — i.e. all three digits matched |
| `benefits`, `headcounts` | Distinct players by survey answer |
| `sectors` | Per-category `{ sectorId, sectorName, games, players, prize }`, busiest first |
| `today` | `{ date, games, players, prize }` for the local date |
| `biggestWin`, `lastPlayedAt` | Highest single payout; most recent `playedAt` |

`PRIZE_POOL_TOTAL = 100_000_000` (Toman) in `store.py` **MUST** match `BUDGET` in
`src/games/number-wheel/config.ts` — the game constant drives difficulty scaling, this one drives the
dashboard's consumption panel. Change both together.

## HTTP API (`backend/admin_server.py`)

| Method + path | Response | Notes |
|---|---|---|
| `GET /`, `/index.html`, `/admin` | the dashboard page | Served from `ADMIN_DIR` with a `relative_to` traversal guard |
| `GET /api/state` | `{ generatedAt, records[], stats }` | Full snapshot; what a page load would need without SSE |
| `GET /api/events` | `text/event-stream` | The live channel (below) |
| `GET /api/export.csv` | `text/csv` + `Content-Disposition: attachment` | Every stored record |
| `GET /api/health` | `{ ok, records }` | Cheap liveness probe |
| `POST /api/results` | the store's result dict | Ingest fallback for browser mode |
| `OPTIONS *` | `204` + CORS | So a cross-port game page may POST |
| anything else | `404` JSON | |

Cross-cutting behaviour:

- `protocol_version = "HTTP/1.1"`; every response carries `Content-Length`, `Cache-Control: no-store`
  and `Access-Control-Allow-Origin: *` (the game page may be on the Vite dev server or nginx on a
  different port).
- `log_message` is **overridden** and routed to the logger. This is not cosmetic: the default writes
  to `sys.stderr`, which is `None` in a windowed (`-w`) PyInstaller build, so every single request
  would raise.
- `POST /api/results` rejects a missing/oversized `Content-Length` (`MAX_BODY_BYTES = 256 KiB`) and
  non-JSON bodies before touching the store.
- `BrokenPipeError` / `ConnectionResetError` are expected (the operator closed the tab) and logged at
  `debug`.

### The Live Channel (SSE)

```
GET /api/events
  → event: snapshot   { generatedAt, records[], stats }     immediately, on every (re)connect
  → event: record     { record, stats }                     once per completed game iteration
  → ": ping"                                                comment heartbeat every 15 s idle
```

The design decision worth preserving: **the first message on every connection is a complete
snapshot.** A dropped connection therefore needs no cursor, no event replay, and no missed-event
bookkeeping — `EventSource`'s own automatic reconnect is the entire recovery story, and the next
snapshot replaces the page's state wholesale so it cannot be stale.

An open-ended stream can carry no `Content-Length`, so `_stream_events` sets `Connection: close` and
`self.close_connection = True`; the body then legitimately ends when the connection does. It also
sends `X-Accel-Buffering: no` so any reverse proxy in front of it does not buffer.

### CSV Export

`GameStore.csv_bytes()` exports **all** stored records, not the visible page — 17 columns with
spreadsheet-friendly English headers (`Played At (ISO)`, `Played At (local)`, `Mobile`, `Category`,
`Category ID`, `Try #`, `Employee Count`, `Has Benefits`, `Target Number`, `Final Number`,
`Correct Digits`, `Perfect`, `Won Amount (Toman)`, `Score`, `Game`, `User ID`, `Source File`).
UTF-8 **with a BOM** and CRLF line endings — that combination is what makes Excel render the Persian
category names instead of mojibake.

## The Page (`backend/admin/index.html`)

One file, no build step, no CDN request (the venue may be offline), no framework. Persian RTL chrome;
all data values render in **Latin digits** inside `.num { direction: ltr; font-variant-numeric:
tabular-nums }` so columns of numbers stay comparable at a glance.

Layout, top to bottom:

1. **Header** — brand, live status pill (`#status`), last-played clock, CSV download button.
2. **Summary cards** (`#cards`) — players, games played, winners, prize paid out, budget remaining,
   full 3-digit wins; each with a secondary line (today's figures, retry count, win rate, budget %).
3. **Prize pool panel** — consumed / remaining / average-per-player figures plus a proportional fill
   bar with the percentage, and an over-budget note if `overspent > 0`.
4. **Winning distribution** (`#dist`) — bars for 1 / 2 / 3 correct digits (distinct players) plus a
   total-winners bar scaled against the player count.
5. **Game outcomes** (`#outcomes`) — per-game bars for 0/1/2/3 correct digits, and a **category
   table** (`#sectors`) with games, players, and prize per category.
6. **Player table** — search box, filter (`all` / `winners` / `losers` / `perfect`), page size
   (25/50/100), sortable headers, pagination. Columns: زمان, موبایل, دسته‌بندی, تلاش, عدد هدف, عدد
   نهایی, ارقام درست, جایزه (تومان), تعداد کارکنان, رفاهیات.
7. **Footer** — states where the data comes from.

Client behaviour:

| Aspect | Detail |
|---|---|
| Transport | `new EventSource("/api/events")`; `snapshot` replaces state wholesale, `record` appends if the `id` is unseen and flashes the row for 5 s |
| Status pill | `live` on `open`/`snapshot`, `down` on `error` (with "reconnecting…" text) — `EventSource` retries by itself |
| Sorting | Header click toggles direction; numeric columns compare as numbers with `null` sorting lowest, text columns use `localeCompare(…, "fa")`; the tiebreak is always most-recent-first |
| Search | Substring match over mobile, category, target, final number, and userId |
| Escaping | Every interpolated value goes through `esc()` — records cross a JS bridge and land in `innerHTML` |
| Headcount labels | `HEADCOUNT_LABELS` maps `0/10/50/300/301` to the survey's Persian wording. Keep it in step with `COUNT_TO_EMPLOYEES` in `src/pages/SurveyPage.tsx` |

**The kiosk's UI constraints do not apply to this page.** It is a desktop monitoring screen operated
with a mouse and keyboard, so it deliberately uses real `<input>` / `<select>` elements and it
scrolls. Do not "fix" those to match the kiosk rules.

## Ingest Transports

`src/services/gameExporter.ts` is the only module in `src/` allowed to touch `window.pywebview` and
the only one that makes a network request. `GamePage.handleComplete` calls it fire-and-forget, exactly
once per completed iteration (a retry is a new iteration and exports again with its own `attempt`).

| Order | Transport | When it applies |
|---|---|---|
| 1 | `window.pywebview.api.export_game_result(result)` | The packaged/desktop host — an in-process function call, no network |
| 2 | `POST http://localhost:8239/api/results` | Vite dev server, `npm run preview`, Docker/nginx — anywhere the bridge is absent, or present but broken |
| 3 | silent no-op | Neither reachable (e.g. the panel is not running). The kiosk flow and `saveStatus` never depend on the export |

The POST uses `AbortSignal.timeout(3000)`, `credentials: "omit"`, and `keepalive: true`, and swallows
every error. A present-but-broken bridge (method missing, or the call rejects) emits one diagnostic
`console.warn` before falling through to HTTP, so an integration problem is visible in DevTools
without ever surfacing to the player.

Because `GameStore` dedupes on `playerKey|attempt|playedAt`, a record delivered twice cannot
double-count a prize.

## Running It

```bash
cd backend
uv sync                                        # first time
.venv/Scripts/python.exe main.py               # game window + dashboard  (normal)
.venv/Scripts/python.exe main.py --no-window    # dashboard only          (monitoring, verification)
.venv/Scripts/python.exe main.py --no-admin     # game window only
.venv/Scripts/python.exe main.py --port 9000    # move the dashboard off 8239
.venv/Scripts/python.exe main.py --host 127.0.0.1   # loopback only
```

Then open **`http://localhost:8239`** on the kiosk machine, or **`http://<kiosk-ip>:8239`** from any
device on the same network — the panel binds **`0.0.0.0` by default**, so other machines on the LAN can
reach it (there is no authentication; see `12_KNOWN_GAPS_AND_RISKS.md` E7). The packaged
`smartis-game.exe` accepts the same flags.
Unrecognised flags are warned about and ignored — a typo must never stop the kiosk from opening at
the venue.

Everything the panel shows is read from `backend/output/`, so the two sides can be restarted
independently and in any order without losing history.

## Packaging

`<repo-root>/build.ps1` bundles both payloads:

```
pyinstaller -y -D -w -n smartis-game --add-data "frontend;frontend" --add-data "admin;admin" main.py
```

Both are required — `frontend` for the window, `admin` for the dashboard page. `_payload_dir(name,
marker)` in `main.py` lets a `frontend/` or `admin/` placed **next to the .exe** override the bundled
copy, so a fresh `npm run build` or an edited dashboard page can be dropped in without re-running
PyInstaller. `output/` and `pywebview.log` always live next to the .exe (`BASE_DIR`), never inside
`_internal/` — see `09_BUILD_RUN_DEPLOY.md`.

## Invariants An Agent Must Not Break

| Invariant | Why |
|---|---|
| The dashboard never mutates game state | It is a monitor. `POST /api/results` only *adds* a completed iteration; there is no edit/delete endpoint |
| A dashboard failure never stops the game | Bind failure → logged, `None`, game continues. Ingest failure → swallowed by the exporter |
| All writes to `backend/output/` go through `GameStore.add_record` | It is the only thing holding the lock and the sequence-claim logic |
| The sequential export files are never rewritten | They are the system of record; the daily array is the derived artifact |
| `log_message` stays overridden in `AdminRequestHandler` | The default writes to `sys.stderr`, which is `None` in the windowed build |
| Every `/api/events` connection starts with a full snapshot | It is what removes all reconnect bookkeeping |
| `PRIZE_POOL_TOTAL` matches the game's `BUDGET` | Otherwise the dashboard's budget panel and the game's difficulty scaling disagree |
| The panel adds no Python or JS dependency | The PyInstaller bundle currently needs none beyond `pywebview` |
| Nothing in `frontend/src/` imports or renders the panel | The kiosk's appearance must stay byte-for-byte unchanged |
