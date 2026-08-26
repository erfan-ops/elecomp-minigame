/**
 * Application routes — the screens of the kiosk journey, in order.
 * Navigation is a simple phase switch inside the session; the game is never
 * responsible for routing.
 */
import type { ComponentType } from "react";
import { CategorySelectionPage } from "../pages/CategorySelectionPage";
import { GamePage } from "../pages/GamePage";
import { LeaderboardPage } from "../pages/LeaderboardPage";
import { RegistrationPage } from "../pages/RegistrationPage";
import { SurveyPage } from "../pages/SurveyPage";
import type { AppPhase } from "./AppSession";

export interface AppRoute {
  id: AppPhase;
  /** Persian label (used for accessible announcements). */
  label: string;
  component: ComponentType;
}

export const APP_ROUTES: readonly AppRoute[] = [
  { id: "REGISTRATION", label: "ثبت‌نام", component: RegistrationPage },
  { id: "SURVEY", label: "نظرسنجی", component: SurveyPage },
  { id: "CATEGORY", label: "انتخاب دسته‌بندی", component: CategorySelectionPage },
  { id: "GAME", label: "بازی", component: GamePage },
  { id: "LEADERBOARD", label: "جدول برترین‌ها", component: LeaderboardPage },
];
