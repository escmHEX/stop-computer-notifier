export type Language = "es" | "en";
export type Theme = "light" | "dark" | "system";
export type NotificationSound =
  | "breeze"
  | "bell"
  | "drops"
  | "pulse"
  | "aurora";
export interface Settings {
  workMinutes: number;
  breakMinutes: number;
  sound: boolean;
  notificationSound: NotificationSound;
  startWithWindows: boolean;
  language: Language;
  theme: Theme;
}
export type Phase = "working" | "pending" | "snoozed" | "resting";
export type TimerAction =
  | "startBreak"
  | "snooze"
  | "pause"
  | "resume"
  | "restart";
export interface TimerSnapshot {
  phase: Phase;
  paused: boolean;
  blocked: boolean;
  remainingMs: number;
  durationMs: number;
  token: string;
}
export type Problem =
  | "loadFailed"
  | "saveFailed"
  | "soundFailed"
  | "notificationFailed"
  | "notificationUnconfirmed"
  | "settingsRecovered"
  | "startupUnavailable"
  | "invalidSettings";
export interface AppSnapshot {
  timer: TimerSnapshot;
  settings: Settings;
  dark: boolean;
  startupAvailable: boolean;
  problem: Problem | null;
  version: string;
}
export type Result = { ok: true } | { ok: false; error: Problem };
export interface DesktopAPI {
  getSnapshot(): Promise<AppSnapshot>;
  subscribe(listener: (snapshot: AppSnapshot) => void): () => void;
  saveSettings(settings: Settings): Promise<Result>;
  act(action: TimerAction, token: string): Promise<void>;
  testNotification(sound: NotificationSound, enabled: boolean): Promise<Result>;
  previewSound(sound: NotificationSound): Promise<Result>;
  openNotificationSettings(): Promise<void>;
  closeWindow(): Promise<void>;
  minimizeWindow(): Promise<void>;
  clearProblem(): Promise<void>;
}
export const IPC = {
  snapshot: "scn:snapshot",
  changed: "scn:changed",
  save: "scn:save",
  action: "scn:action",
  test: "scn:test",
  previewSound: "scn:preview-sound",
  notificationSettings: "scn:notification-settings",
  close: "scn:close",
  minimize: "scn:minimize",
  clearProblem: "scn:clear-problem",
} as const;
