/**
 * Central application session — the single source of truth for the kiosk
 * journey: user, chosen sector, phase, and result-persistence status.
 * Pages consume this context; nothing is duplicated between pages.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Category } from "../domain/category";
import type { GameSessionResult } from "../domain/gameResult";
import type { SurveyAnswers } from "../domain/survey";
import type { User } from "../domain/user";
import { resultRepository } from "../services";

export type AppPhase = "REGISTRATION" | "SURVEY" | "CATEGORY" | "GAME" | "LEADERBOARD";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface AppSessionValue {
  phase: AppPhase;
  user: User | null;
  category: Category | null;
  /** The organization survey answered after registration. */
  survey: SurveyAnswers | null;
  /** Persistence state of the current session's game result. */
  saveStatus: SaveStatus;
  savedResult: GameSessionResult | null;
  /** Registration completed → survey. */
  register: (user: User) => void;
  /** Survey answered → category selection. */
  completeSurvey: (survey: SurveyAnswers) => void;
  /** Category chosen → game. */
  selectCategory: (category: Category) => void;
  /** Persist a fully combined session result (built by the game host). */
  submitResult: (result: GameSessionResult) => Promise<void>;
  /** Re-attempt persistence after a failure. */
  retrySave: () => Promise<void>;
  /** Continue after the result was shown → leaderboard. */
  goToLeaderboard: () => void;
  /** End the session and return to registration with a clean slate. */
  startNewUser: () => void;
}

const AppSessionContext = createContext<AppSessionValue | null>(null);

interface SessionState {
  phase: AppPhase;
  user: User | null;
  category: Category | null;
  survey: SurveyAnswers | null;
  saveStatus: SaveStatus;
  savedResult: GameSessionResult | null;
}

export function AppSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({
    phase: "REGISTRATION",
    user: null,
    category: null,
    survey: null,
    saveStatus: "idle",
    savedResult: null,
  });
  /** The result awaiting persistence, kept for retries. */
  const pendingResultRef = useRef<GameSessionResult | null>(null);
  /** Guards against duplicate/overlapping saves. */
  const savingRef = useRef(false);

  const register = useCallback((user: User) => {
    pendingResultRef.current = null;
    setState({
      phase: "SURVEY",
      user,
      category: null,
      survey: null,
      saveStatus: "idle",
      savedResult: null,
    });
  }, []);

  const completeSurvey = useCallback((survey: SurveyAnswers) => {
    setState((prev) => (prev.user ? { ...prev, phase: "CATEGORY", survey } : prev));
  }, []);

  const selectCategory = useCallback((category: Category) => {
    setState((prev) => (prev.user ? { ...prev, phase: "GAME", category } : prev));
  }, []);

  const submitResult = useCallback(async (result: GameSessionResult) => {
    if (savingRef.current) return;
    savingRef.current = true;
    pendingResultRef.current = result;
    setState((prev) => ({ ...prev, saveStatus: "saving" }));
    try {
      await resultRepository.save(result);
      setState((prev) => ({ ...prev, saveStatus: "saved", savedResult: result }));
    } catch {
      setState((prev) => ({ ...prev, saveStatus: "error" }));
    } finally {
      savingRef.current = false;
    }
  }, []);

  const retrySave = useCallback(async () => {
    const pending = pendingResultRef.current;
    if (!pending || savingRef.current) return;
    savingRef.current = true;
    setState((prev) => ({ ...prev, saveStatus: "saving" }));
    try {
      await resultRepository.save(pending);
      setState((prev) => ({ ...prev, saveStatus: "saved", savedResult: pending }));
    } catch {
      setState((prev) => ({ ...prev, saveStatus: "error" }));
    } finally {
      savingRef.current = false;
    }
  }, []);

  const goToLeaderboard = useCallback(() => {
    setState((prev) => ({ ...prev, phase: "LEADERBOARD" }));
  }, []);

  const startNewUser = useCallback(() => {
    pendingResultRef.current = null;
    savingRef.current = false;
    setState({
      phase: "REGISTRATION",
      user: null,
      category: null,
      survey: null,
      saveStatus: "idle",
      savedResult: null,
    });
  }, []);

  const value = useMemo(
    () => ({
      phase: state.phase,
      user: state.user,
      category: state.category,
      survey: state.survey,
      saveStatus: state.saveStatus,
      savedResult: state.savedResult,
      register,
      completeSurvey,
      selectCategory,
      submitResult,
      retrySave,
      goToLeaderboard,
      startNewUser,
    }),
    [
      state.phase,
      state.user,
      state.category,
      state.survey,
      state.saveStatus,
      state.savedResult,
      register,
      completeSurvey,
      selectCategory,
      submitResult,
      retrySave,
      goToLeaderboard,
      startNewUser,
    ],
  );

  return <AppSessionContext.Provider value={value}>{children}</AppSessionContext.Provider>;
}

export function useAppSession(): AppSessionValue {
  const session = useContext(AppSessionContext);
  if (!session) {
    throw new Error("useAppSession must be used inside AppSessionProvider");
  }
  return session;
}
