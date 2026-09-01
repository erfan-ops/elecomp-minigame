/**
 * Optional bridge to the Python host (`backend/`) for on-disk persistence.
 *
 * Two transports, tried in order, both best-effort:
 *
 * 1. `window.pywebview.api.export_game_result` — present when the built app
 *    runs inside the pywebview desktop wrapper. Python owns the output
 *    directory, the dates, and the sequence numbers.
 * 2. `POST http://localhost:8239/api/results` — the admin panel's ingest
 *    endpoint, used when the pywebview bridge is absent or broken (dev server,
 *    nginx/Docker, a browser opened alongside the host). The same `GameStore`
 *    persists it, so the operator's records and the dashboard are identical
 *    either way.
 *
 * With neither available the export silently does nothing: localStorage remains
 * the app's only persistence and the kiosk flow never depends on this
 * succeeding. Records are de-duplicated by the Python side, so it is safe for
 * both transports to reach it.
 *
 * Naming: pywebview 6 exposes each Api method under its verbatim Python
 * name — no camelCase conversion — so the Python method `export_game_result`
 * is reachable as `window.pywebview.api.export_game_result`.
 */
import type { GameSessionResult } from "../domain/gameResult";

/** Ingest endpoint of the admin panel (`backend/admin_server.py`). */
const ADMIN_INGEST_URL = "http://localhost:8239/api/results";

/** Never let a stalled request outlive the result screen it belongs to. */
const ADMIN_INGEST_TIMEOUT_MS = 3000;

/** The narrow slice of pywebview's JS API the exporter uses. */
interface PywebviewExportApi {
  export_game_result: (data: GameSessionResult) => Promise<{ success: boolean }>;
}

interface PywebviewHost {
  api?: PywebviewExportApi;
}

function pywebviewHost(): PywebviewHost | null {
  return (window as Window & { pywebview?: PywebviewHost }).pywebview ?? null;
}

/**
 * Pushes the result to the admin panel's HTTP ingest endpoint.
 * Resolves `true` only when the record was actually stored.
 */
async function postToAdmin(result: GameSessionResult): Promise<boolean> {
  try {
    const response = await fetch(ADMIN_INGEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
      signal: AbortSignal.timeout(ADMIN_INGEST_TIMEOUT_MS),
      // The panel is a local monitoring tool; no cookies are involved.
      credentials: "omit",
      keepalive: true,
    });
    return response.ok;
  } catch {
    // Nothing listening on 8239 — the expected case for a standalone browser.
    return false;
  }
}

/**
 * Hands one completed game iteration to the Python host for on-disk export.
 * Best-effort: a failed call never affects the kiosk flow. The failure modes
 * are distinguishable in the console for diagnosis:
 * - neither transport available → plain standalone browser, expected, silent;
 * - pywebview present but the method missing or the call rejected → real
 *   integration problem (wrong method name, backend error) → `console.warn`,
 *   and the HTTP transport is tried instead.
 */
export async function exportGameResult(result: GameSessionResult): Promise<void> {
  const host = pywebviewHost();
  if (host && !host.api?.export_game_result) {
    console.warn(
      "[gameExporter] pywebview is present but the export_game_result API method is not exposed",
    );
  }
  if (host?.api?.export_game_result) {
    try {
      await host.api.export_game_result(result);
      return;
    } catch (error) {
      console.warn("[gameExporter] on-disk export failed:", error);
    }
  }
  await postToAdmin(result);
}
