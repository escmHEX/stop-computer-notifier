import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type {
  AppSnapshot,
  DesktopAPI,
  Settings,
  TimerAction,
} from "../shared/contracts.ts";
import { messages, format, formatTime } from "../shared/i18n.ts";
import { PRODUCT, TIMING, NOTIFICATION_SOUNDS } from "../shared/config.ts";
import "./style.css";
declare global {
  interface Window {
    notifier: DesktopAPI;
  }
}
const api = window.notifier;
const icons = {
  pause: "M8 5v14M16 5v14",
  play: "M8 5l11 7-11 7Z",
  restart: "M3 10a9 9 0 1 1 2.6 8.4M3 3v7h7",
  cup: "M5 8h12v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4ZM17 9h2a3 3 0 0 1 0 6h-2M3 22h17M8 2v3M13 2v3",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 6v6l4 2",
  settings:
    "M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
  next: "m9 5 7 7-7 7",
  close: "m6 6 12 12M6 18 18 6",
  minus: "M5 12h14",
  back: "M20 12H4m7-7-7 7 7 7",
  windows: "M3 5l8-1v7H3ZM13 4l8-1v8h-8ZM3 13h8v7l-8-1ZM13 13h8v8l-8-1Z",
  sound: "M3 9h4l5-4v14l-5-4H3ZM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14",
  language:
    "M3 5h12M9 3v2M5 5c0 5 4 9 9 11M13 5c0 5-4 9-10 11M14 21l4-10 4 10M16 17h4",
  theme: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 3v18",
  bell: "M5 16h14l-2-3V9a5 5 0 0 0-10 0v4ZM10 20h4",
  save: "M4 3h13l3 3v15H4ZM8 3v6h8V3M8 21v-7h8v7",
};
function Icon({ name }: { name: keyof typeof icons }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={icons[name]} />
    </svg>
  );
}
function App() {
  const [state, setState] = useState<AppSnapshot | null>(null);
  const [received, setReceived] = useState(0);
  const [now, setNow] = useState(0);
  const [editing, setEditing] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const accept = (value: AppSnapshot) => {
      setState(value);
      const time = performance.now();
      setReceived(time);
      setNow(time);
    };
    const unsubscribe = api.subscribe(accept);
    void api
      .getSnapshot()
      .then(accept)
      .catch(() => setFailed(true));
    return unsubscribe;
  }, []);
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const refresh = () => {
      clearInterval(interval);
      if (!document.hidden) {
        void api.getSnapshot().then((value) => {
          setState(value);
          setReceived(performance.now());
          setNow(performance.now());
        });
        interval = setInterval(() => setNow(performance.now()), 1000);
      }
    };
    refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  useEffect(() => {
    if (state) {
      document.documentElement.dataset.theme = state.dark ? "dark" : "light";
      document.documentElement.lang = state.settings.language;
    }
  }, [state?.dark, state?.settings.language]);
  if (!state)
    return (
      <main className="loading">
        {failed ? messages.es.loadFailed : messages.es.loading}
      </main>
    );
  const t = messages[state.settings.language];
  const timer = state.timer;
  const rest = timer.phase === "resting";
  const pending = timer.phase === "pending";
  const stopped = timer.paused && !rest;
  const remaining = Math.max(
    0,
    timer.remainingMs - (timer.blocked || stopped ? 0 : now - received),
  );
  const status = rest
    ? t.resting
    : stopped
      ? t.paused
      : pending
        ? t.pending
        : timer.phase === "snoozed"
          ? t.snoozed
          : t.session;
  const act = (action: TimerAction) => void api.act(action, timer.token);
  return (
    <div className="app">
      <header className="titlebar">
        <span className="brand">
          <Icon name="pause" />
        </span>
        <span>{PRODUCT}</span>
        <div className="window-actions">
          <button
            aria-label={t.minimize}
            onClick={() => void api.minimizeWindow()}
          >
            <Icon name="minus" />
          </button>
          <button aria-label={t.close} onClick={() => void api.closeWindow()}>
            <Icon name="close" />
          </button>
        </div>
      </header>
      {state.problem && (
        <div className="alert" role="alert">
          {t[state.problem]}
          <button
            aria-label={t.dismiss}
            onClick={() => void api.clearProblem()}
          >
            <Icon name="close" />
          </button>
        </div>
      )}
      {editing ? (
        <SettingsView state={state} back={() => setEditing(false)} />
      ) : (
        <main className="timer-view">
          <span className="status">
            <span className="dot" />
            {status}
          </span>
          <div className="dial">
            <svg viewBox="0 0 240 240" aria-hidden="true">
              <circle className="track" cx="120" cy="120" r="109" />
              <circle
                className="progress"
                cx="120"
                cy="120"
                r="109"
                strokeDasharray={Math.PI * 218}
                strokeDashoffset={
                  Math.PI * 218 * (1 - remaining / timer.durationMs)
                }
              />
            </svg>
            <div className="dial-copy">
              <span className="count" aria-label={t.remaining}>
                {formatTime(remaining)}
              </span>
              <span>
                {rest
                  ? t.untilEnd
                  : pending || timer.phase === "snoozed"
                    ? t.nextReminder
                    : t.until}
              </span>
            </div>
          </div>
          <h1>
            {rest
              ? t.restHeading
              : stopped
                ? t.pauseHeading
                : pending
                  ? t.dueHeading
                  : t.heading}
          </h1>
          <p className="subtitle">
            {rest
              ? t.restSubtitle
              : stopped
                ? t.pauseSubtitle
                : pending
                  ? t.dueSubtitle
                  : t.subtitle}
          </p>
          <div className="actions">
            {!rest && (
              <button className="primary" onClick={() => act("startBreak")}>
                <Icon name="cup" />
                {pending ? t.begin : t.start}
              </button>
            )}
            <button
              className="secondary"
              onClick={() => act(timer.paused ? "resume" : "pause")}
            >
              <Icon name={timer.paused ? "play" : "pause"} />
              {timer.paused ? t.resume : t.pause}
            </button>
            <button
              className="secondary restart-button"
              aria-label={t.restart}
              title={t.restart}
              disabled={timer.blocked}
              onClick={() => act("restart")}
            >
              <Icon name="restart" />
            </button>
            {pending && !timer.paused && (
              <button className="text-button" onClick={() => act("snooze")}>
                {format(t.snooze, { minutes: TIMING.snoozeMinutes })}
              </button>
            )}
          </div>
          {rest && timer.paused && <p className="hint">{t.nextPaused}</p>}
          <div className="bottom">
            <div className="summary">
              <div>
                <Icon name="clock" />
                <span>
                  {format(t.sessionSummary, {
                    minutes: state.settings.workMinutes,
                  })}
                  <small>{t.workInterval}</small>
                </span>
              </div>
              <div>
                <Icon name="cup" />
                <span>
                  {format(t.breakSummary, {
                    minutes: state.settings.breakMinutes,
                  })}
                  <small>{t.breakDuration}</small>
                </span>
              </div>
            </div>
            <button className="settings-link" onClick={() => setEditing(true)}>
              <Icon name="settings" />
              {t.settings}
              <Icon name="next" />
            </button>
          </div>
        </main>
      )}
      <footer>
        <span className="dot" />
        {t.background}
        <span className="version">{state.version}</span>
      </footer>
    </div>
  );
}
function SettingsView({
  state,
  back,
}: {
  state: AppSnapshot;
  back: () => void;
}) {
  const [draft, setDraft] = useState<Settings>(state.settings);
  const [work, setWork] = useState(String(draft.workMinutes));
  const [rest, setRest] = useState(String(draft.breakMinutes));
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [testing, setTesting] = useState(false);
  const t = messages[state.settings.language];
  const valid = [work, rest].every(
    (value) =>
      /^\d+$/.test(value) &&
      Number(value) >= TIMING.minMinutes &&
      Number(value) <= TIMING.maxMinutes,
  );
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      const result = await api.saveSettings({
        ...draft,
        workMinutes: Number(work),
        breakMinutes: Number(rest),
      });
      setFeedback(result.ok ? messages[draft.language].saved : t[result.error]);
    } catch {
      setFeedback(t.saveFailed);
    } finally {
      setBusy(false);
    }
  };
  const testNotification = async (previewSound = false) => {
    setTesting(true);
    setFeedback("");
    try {
      const result = previewSound
        ? await api.previewSound(draft.notificationSound)
        : await api.testNotification(draft.notificationSound, draft.sound);
      setFeedback(
        result.ok
          ? previewSound
            ? t.soundPlayed
            : t.testSent
          : t[result.error],
      );
    } catch {
      setFeedback(previewSound ? t.soundFailed : t.notificationFailed);
    } finally {
      setTesting(false);
    }
  };
  return (
    <main className="settings-view">
      <button
        className="icon-button back"
        aria-label={t.back}
        title={t.back}
        onClick={back}
      >
        <Icon name="back" />
      </button>
      <h1>{t.settingsTitle}</h1>
      <form onSubmit={save}>
        <div className="durations">
          <label>
            <span className="setting-name">
              <Icon name="clock" />
              {t.workInterval}
            </span>
            <div className="number">
              <input
                aria-label={t.workInterval}
                type="number"
                min={TIMING.minMinutes}
                max={TIMING.maxMinutes}
                step="1"
                required
                value={work}
                onChange={(e) => setWork(e.target.value)}
              />
              <span>min</span>
            </div>
          </label>
          <label>
            <span className="setting-name">
              <Icon name="cup" />
              {t.breakDuration}
            </span>
            <div className="number">
              <input
                aria-label={t.breakDuration}
                type="number"
                min={TIMING.minMinutes}
                max={TIMING.maxMinutes}
                step="1"
                required
                value={rest}
                onChange={(e) => setRest(e.target.value)}
              />
              <span>min</span>
            </div>
          </label>
        </div>
        <p className="hint" role={valid ? undefined : "alert"}>
          {valid
            ? t.nextCycle
            : format(t.invalid, {
                min: TIMING.minMinutes,
                max: TIMING.maxMinutes,
              })}
        </p>
        <div className="setting-row sound-picker">
          <span className="setting-name">
            <Icon name="sound" />
            {t.sound}
          </span>
          <div className="sound-controls">
            <select
              id="notification-sound"
              aria-label={t.tone}
              value={draft.notificationSound}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  notificationSound: e.target
                    .value as Settings["notificationSound"],
                })
              }
            >
              {NOTIFICATION_SOUNDS.map((sound) => (
                <option key={sound} value={sound}>
                  {t.soundNames[sound]}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="icon-button"
              aria-label={t.previewSound}
              title={t.previewSound}
              disabled={testing}
              onClick={() => void testNotification(true)}
            >
              <Icon name="play" />
            </button>
            <input
              aria-label={t.sound}
              type="checkbox"
              role="switch"
              checked={draft.sound}
              onChange={(e) => setDraft({ ...draft, sound: e.target.checked })}
            />
          </div>
        </div>
        <label className="setting-row">
          <span className="setting-name">
            <Icon name="windows" />
            {t.startup}
          </span>
          <input
            type="checkbox"
            role="switch"
            disabled={!state.startupAvailable}
            checked={draft.startWithWindows}
            onChange={(e) =>
              setDraft({ ...draft, startWithWindows: e.target.checked })
            }
          />
        </label>
        <label className="setting-row">
          <span className="setting-name" title={t.language}>
            <Icon name="language" />
            <span className="sr-only">{t.language}</span>
          </span>
          <select
            aria-label={t.language}
            value={draft.language}
            onChange={(e) =>
              setDraft({
                ...draft,
                language: e.target.value as Settings["language"],
              })
            }
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="setting-row">
          <span className="setting-name" title={t.appearance}>
            <Icon name="theme" />
            <span className="sr-only">{t.appearance}</span>
          </span>
          <select
            aria-label={t.appearance}
            value={draft.theme}
            onChange={(e) =>
              setDraft({ ...draft, theme: e.target.value as Settings["theme"] })
            }
          >
            <option value="system">{t.system}</option>
            <option value="light">{t.light}</option>
            <option value="dark">{t.dark}</option>
          </select>
        </label>
        <button className="primary save" disabled={busy || !valid}>
          <Icon name="save" />
          {busy ? t.saving : t.save}
        </button>
      </form>
      <button
        className="text-button test"
        disabled={testing}
        onClick={() => void testNotification()}
      >
        <Icon name="bell" />
        {testing ? t.testing : t.test}
      </button>
      <p className="hint feedback" role="status">
        {feedback || t.notificationHint}
      </p>
      <details className="hint priority-help">
        <summary>{t.priorityHelp}</summary>
        <p>{t.prioritySteps}</p>
      </details>
      <button
        className="text-button notification-settings"
        onClick={() => void api.openNotificationSettings()}
      >
        <Icon name="windows" />
        {t.notificationSettings}
      </button>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
