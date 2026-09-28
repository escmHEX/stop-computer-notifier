import { Sounds } from "./sounds.ts";
import { Notification } from "electron";
import { NOTIFICATION_RESPONSE_TIMEOUT_MS } from "../shared/config.ts";
import { toastXml, toastAction } from "../shared/toast.ts";
import type {
  Settings,
  TimerAction,
  TimerSnapshot,
  Result,
} from "../shared/contracts.ts";
import type { TimerNotice } from "../core/timer.ts";

export class Notifications {
  private readonly sounds = new Sounds();
  previewSound(sound: Settings["notificationSound"]): Promise<Result> {
    return this.sounds.play(sound);
  }
  private current: Notification | null = null;
  private sample: Notification | null = null;
  private testing: Promise<Result> | null = null;
  private readonly action: (action: TimerAction, token: string) => void;
  private readonly failed: () => void;
  private readonly soundFailed: () => void;
  private readonly open: () => void;
  constructor(
    action: (action: TimerAction, token: string) => void,
    failed: () => void,
    open: () => void,
    soundFailed: () => void,
  ) {
    this.action = action;
    this.failed = failed;
    this.open = open;
    this.soundFailed = soundFailed;
  }
  activate(argumentsText: string): void {
    const value = toastAction(argumentsText);
    if (value) this.action(value.action, value.token);
  }
  clear(): void {
    this.sounds.dispose();
    this.current?.close();
    this.current = null;
  }
  show(kind: TimerNotice, timer: TimerSnapshot, settings: Settings): void {
    this.clear();
    try {
      const note = new Notification({
        id: "break",
        groupId: "reminders",
        toastXml: toastXml(settings, kind, timer.token, timer.paused),
      });
      this.current = note;
      note.on("failed", this.failed);
      note.on("click", this.open);
      note.show();
      if (settings.sound)
        void this.sounds.play(settings.notificationSound).then((result) => {
          if (!result.ok) this.soundFailed();
        });
    } catch {
      this.failed();
    }
  }
  test(settings: Settings): Promise<Result> {
    if (this.testing) return this.testing;
    if (!Notification.isSupported())
      return Promise.resolve({ ok: false, error: "notificationFailed" });
    this.sample?.close();
    // Electron's show event confirms OS acceptance, not banner visibility. Windows
    // can still route it silently to Notification Center when Do not disturb is on.
    const audio = settings.sound
      ? this.sounds.play(settings.notificationSound)
      : Promise.resolve<Result>({ ok: true });
    this.testing = new Promise<Result>((resolve) => {
      const note = new Notification({
        id: "sample",
        groupId: "tests",
        toastXml: toastXml(settings, "test"),
      });
      this.sample = note;
      note.on("click", this.open);
      let settled = false;
      const finish = (result: Result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(result);
      };
      const timeout = setTimeout(
        () => finish({ ok: false, error: "notificationUnconfirmed" }),
        NOTIFICATION_RESPONSE_TIMEOUT_MS,
      );
      note.once("show", () => finish({ ok: true }));
      note.on("failed", () => {
        this.failed();
        finish({ ok: false, error: "notificationFailed" });
      });
      try {
        note.show();
      } catch {
        finish({ ok: false, error: "notificationFailed" });
      }
    })
      .then(async (result) => {
        const soundResult = await audio;
        return result.ok ? soundResult : result;
      })
      .finally(() => {
        this.testing = null;
      });
    return this.testing;
  }
  dispose(): void {
    this.clear();
    this.sample?.close();
    this.sample = null;
  }
}
