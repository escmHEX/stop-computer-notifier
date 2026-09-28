import type { Settings, NotificationSound } from "./contracts.ts";
export const NOTIFICATION_SOUNDS: readonly NotificationSound[] = [
  "breeze",
  "bell",
  "drops",
  "pulse",
  "aurora",
];
export const NOTIFICATION_RESPONSE_TIMEOUT_MS = 8000;
export const PRODUCT = "Stop Computer Notifier";
export const APP_ID = "io.stopcomputernotifier.app";
export const MINUTE = 60_000;
export const TIMING = {
  snoozeMinutes: 5,
  repeatMinutes: 5,
  minMinutes: 1,
  maxMinutes: 1440,
} as const;
export const DEFAULT_SETTINGS: Settings = {
  workMinutes: 35,
  breakMinutes: 3,
  sound: true,
  notificationSound: "breeze",
  startWithWindows: false,
  language: "es",
  theme: "system",
};

export function parseSettings(value: unknown): Settings {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("invalid-settings");
  const s = value as Record<string, unknown>;
  const validMinutes = (v: unknown) =>
    typeof v === "number" &&
    Number.isInteger(v) &&
    v >= TIMING.minMinutes &&
    v <= TIMING.maxMinutes;
  if (
    Object.keys(s).length !== 7 ||
    !validMinutes(s.workMinutes) ||
    !validMinutes(s.breakMinutes) ||
    typeof s.sound !== "boolean" ||
    !NOTIFICATION_SOUNDS.includes(s.notificationSound as NotificationSound) ||
    typeof s.startWithWindows !== "boolean" ||
    (s.language !== "es" && s.language !== "en") ||
    typeof s.theme !== "string" ||
    !["system", "light", "dark"].includes(s.theme)
  )
    throw new Error("invalid-settings");
  return {
    workMinutes: s.workMinutes as number,
    breakMinutes: s.breakMinutes as number,
    sound: s.sound,
    notificationSound: s.notificationSound as NotificationSound,
    startWithWindows: s.startWithWindows,
    language: s.language,
    theme: s.theme as Settings["theme"],
  };
}
