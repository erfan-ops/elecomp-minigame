/**
 * Optional bridge to the Python pywebview host (`backend/main.py`).
 *
 * When the built app runs inside the pywebview wrapper, every completed game
 * iteration is pushed through `window.pywebview.api` and the Python side
 * writes it to disk (output directory, dates, and sequence numbers are all
 * owned by Python). In a plain browser — dev server, nginx/Docker — the
 * bridge does not exist and the export silently does nothing: localStorage
 * remains the app's only persistence, and the game flow never depends on
 * this export succeeding.
 *
 * Naming: pywebview 6 exposes each Api method under its verbatim Python
 * name — no camelCase conversion — so the Python method `export_game_result`
 * is reachable as `window.pywebview.api.export_game_result`.
 */
import type { GameSessionResult } from "../domain/gameResult";

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
 * Hands one completed game iteration to the Python host for on-disk export.
 * Best-effort: a failed call never affects the kiosk flow. The two failure
 * modes are distinguishable in the console for diagnosis:
 * - no pywebview at all → plain browser, expected, fully silent;
 * - pywebview present but the method missing or the call rejected → real
 *   integration problem (wrong method name, backend error) → `console.warn`.
 */
export async function exportGameResult(result: GameSessionResult): Promise<void> {
  const host = pywebviewHost();
  if (!host) return;
  if (!host.api?.export_game_result) {
    console.warn(
      "[gameExporter] pywebview is present but the export_game_result API method is not exposed",
    );
    return;
  }
  try {
    await host.api.export_game_result(result);
  } catch (error) {
    console.warn("[gameExporter] on-disk export failed:", error);
  }
}
