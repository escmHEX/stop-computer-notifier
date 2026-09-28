import { MINUTE, TIMING } from "../shared/config.ts";
import type {
  Settings,
  TimerAction,
  TimerSnapshot,
  Phase,
} from "../shared/contracts.ts";

export interface Clock {
  monotonic(): number;
  wall(): number;
  schedule(fn: () => void, delay: number): unknown;
  cancel(handle: unknown): void;
}
export type TimerNotice = "reminder" | "finished";
interface Options {
  clock: Clock;
  sessionId: string;
  settings: Pick<Settings, "workMinutes" | "breakMinutes">;
  changed: () => void;
  notify: (kind: TimerNotice, state: TimerSnapshot) => void;
}

export class BreakTimer {
  private readonly options: Options;
  private phase: Phase = "working";
  private paused = false;
  private blocks = new Set<"lock" | "suspend">();
  private duration: number;
  private remaining: number;
  private deadline: number;
  private revision = 0;
  private handle: unknown;
  private away: { wall: number; remaining: number } | null = null;
  private settings: Options["settings"];

  constructor(options: Options) {
    this.options = options;
    this.settings = { ...options.settings };
    this.duration = this.remaining = this.settings.workMinutes * MINUTE;
    this.deadline = options.clock.monotonic() + this.duration;
    this.arm();
  }
  snapshot(): TimerSnapshot {
    return {
      phase: this.phase,
      paused: this.paused,
      blocked: this.blocks.size > 0,
      remainingMs: this.timeLeft(),
      durationMs: this.duration,
      token: `${this.options.sessionId}:${this.revision}`,
    };
  }
  private timeLeft(): number {
    if (this.blocks.size || (this.paused && this.phase !== "resting"))
      return this.remaining;
    return Math.max(
      0,
      Math.min(this.duration, this.deadline - this.options.clock.monotonic()),
    );
  }
  configure(settings: Options["settings"]): void {
    this.settings = { ...settings };
  }
  private enter(phase: Phase, duration: number): void {
    this.phase = phase;
    this.duration = this.remaining = duration;
    this.deadline = this.options.clock.monotonic() + duration;
  }
  private commit(): void {
    this.revision++;
    this.arm();
    this.options.changed();
  }
  private arm(): void {
    this.dispose();
    if (this.blocks.size || (this.paused && this.phase !== "resting")) return;
    this.handle = this.options.clock.schedule(
      () => this.expire(),
      this.timeLeft(),
    );
  }
  private expire(): void {
    if (this.blocks.size || (this.paused && this.phase !== "resting")) return;
    if (this.timeLeft() > 0) {
      this.arm();
      return;
    }
    const finished = this.phase === "resting";
    this.enter(
      finished ? "working" : "pending",
      (finished ? this.settings.workMinutes : TIMING.repeatMinutes) * MINUTE,
    );
    this.commit();
    this.options.notify(finished ? "finished" : "reminder", this.snapshot());
  }
  act(action: TimerAction, token: string): boolean {
    // Each transition invalidates old toasts and repeated clicks, including across app launches.
    if (token !== this.snapshot().token || this.blocks.size) return false;
    switch (action) {
      case "startBreak":
        if (this.phase === "resting") return false;
        this.enter("resting", this.settings.breakMinutes * MINUTE);
        break;
      case "snooze":
        if (this.phase !== "pending" || this.paused) return false;
        this.enter("snoozed", TIMING.snoozeMinutes * MINUTE);
        break;
      case "pause":
        if (this.paused) return false;
        this.remaining = this.timeLeft();
        this.paused = true;
        break;
      case "resume":
        if (!this.paused) return false;
        this.paused = false;
        if (this.phase !== "resting")
          this.deadline = this.options.clock.monotonic() + this.remaining;
        break;
    }
    this.commit();
    return true;
  }
  setBlocked(reason: "lock" | "suspend", active: boolean): void {
    if (this.blocks.has(reason) === active) return;
    const wasBlocked = this.blocks.size > 0;
    if (!wasBlocked && active && this.phase === "resting")
      this.away = {
        wall: this.options.clock.wall(),
        remaining: this.timeLeft(),
      };
    if (active) this.blocks.add(reason);
    else this.blocks.delete(reason);
    if (!wasBlocked) {
      if (this.phase === "resting") this.remaining = this.away!.remaining;
      else this.enter("working", this.settings.workMinutes * MINUTE);
    } else if (!this.blocks.size) {
      // Lock and suspend overlap. Only the last release resumes the timer. Wall time counts
      // time spent asleep for a break; work uses monotonic time and always starts fresh.
      const restLeft = this.away
        ? this.away.remaining -
          Math.max(0, this.options.clock.wall() - this.away.wall)
        : 0;
      if (this.phase === "resting" && restLeft > 0) {
        this.remaining = restLeft;
        this.deadline = this.options.clock.monotonic() + restLeft;
      } else this.enter("working", this.settings.workMinutes * MINUTE);
      this.away = null;
    }
    this.commit();
  }
  dispose(): void {
    if (this.handle !== undefined) this.options.clock.cancel(this.handle);
    this.handle = undefined;
  }
}
