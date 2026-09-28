import test from "node:test";
import assert from "node:assert/strict";
import { BreakTimer, type Clock } from "../src/core/timer.ts";
import {
  MINUTE,
  DEFAULT_SETTINGS,
  parseSettings,
} from "../src/shared/config.ts";
class FakeClock implements Clock {
  time = 0;
  wallTime = 0;
  next = 0;
  jobs = new Map<number, { at: number; fn: () => void }>();
  monotonic = () => this.time;
  wall = () => this.wallTime;
  schedule = (fn: () => void, delay: number) => {
    const id = ++this.next;
    this.jobs.set(id, { at: this.time + delay, fn });
    return id;
  };
  cancel = (handle: unknown) => {
    this.jobs.delete(handle as number);
  };
  advance(ms: number) {
    this.time += ms;
    this.wallTime += ms;
    for (const [id, job] of [...this.jobs])
      if (job.at <= this.time) {
        this.jobs.delete(id);
        job.fn();
      }
  }
}
function setup() {
  const clock = new FakeClock();
  const notices: string[] = [];
  const timer = new BreakTimer({
    clock,
    settings: DEFAULT_SETTINGS,
    sessionId: "test",
    changed() {},
    notify(kind) {
      notices.push(kind);
    },
  });
  const act = (action: Parameters<BreakTimer["act"]>[0]) =>
    timer.act(action, timer.snapshot().token);
  return { clock, notices, timer, act };
}
test("pending repeats once after delayed wake; starts a break only when accepted", () => {
  const { clock, notices, timer, act } = setup();
  clock.advance(35 * MINUTE);
  assert.equal(timer.snapshot().phase, "pending");
  assert.deepEqual(notices, ["reminder"]);
  clock.advance(30 * MINUTE);
  assert.equal(notices.length, 2);
  assert.equal(clock.jobs.size, 1);
  act("startBreak");
  assert.equal(timer.snapshot().phase, "resting");
  clock.advance(3 * MINUTE);
  assert.equal(timer.snapshot().phase, "working");
  assert.equal(timer.snapshot().remainingMs, 35 * MINUTE);
  assert.equal(notices.at(-1), "finished");
});
test("snooze and stale or repeated actions cannot change a new cycle", () => {
  const { clock, timer, act } = setup();
  const original = timer.snapshot().token;
  clock.advance(35 * MINUTE);
  assert.equal(timer.act("startBreak", original), false);
  const pending = timer.snapshot().token;
  assert.equal(act("snooze"), true);
  assert.equal(timer.act("startBreak", pending), false);
  clock.advance(5 * MINUTE);
  const accepted = timer.snapshot().token;
  assert.equal(act("startBreak"), true);
  assert.equal(timer.act("startBreak", accepted), false);
  assert.equal(act("startBreak"), false);
});
test("pause freezes time, settings apply to subsequent phases, break runs during pause", () => {
  const { clock, timer, act } = setup();
  clock.advance(MINUTE);
  act("pause");
  clock.advance(50 * MINUTE);
  assert.equal(timer.snapshot().remainingMs, 34 * MINUTE);
  timer.configure({ workMinutes: 10, breakMinutes: 2 });
  act("resume");
  assert.equal(timer.snapshot().durationMs, 35 * MINUTE);
  act("startBreak");
  assert.equal(timer.snapshot().durationMs, 2 * MINUTE);
  act("pause");
  clock.advance(2 * MINUTE);
  assert.equal(timer.snapshot().remainingMs, 10 * MINUTE);
  assert.equal(timer.snapshot().paused, true);
  assert.equal(clock.jobs.size, 0);
});
for (const phase of ["working", "pending", "snoozed"] as const)
  for (const paused of [false, true])
    test(`overlapping lock/suspend resets ${phase}, paused=${paused}`, () => {
      const { clock, timer, act, notices } = setup();
      if (phase !== "working") clock.advance(35 * MINUTE);
      if (phase === "snoozed") act("snooze");
      if (paused) act("pause");
      const before = notices.length;
      timer.setBlocked("lock", true);
      timer.setBlocked("suspend", true);
      timer.setBlocked("lock", true);
      clock.advance(60 * MINUTE);
      timer.setBlocked("suspend", false);
      assert.equal(clock.jobs.size, 0);
      timer.setBlocked("lock", false);
      assert.equal(timer.snapshot().remainingMs, 35 * MINUTE);
      assert.equal(timer.snapshot().paused, paused);
      assert.equal(notices.length, before);
      assert.equal(clock.jobs.size, paused ? 0 : 1);
    });
for (const elapsed of [MINUTE, 5 * MINUTE])
  test(`rest accounts for wall time asleep: ${elapsed}`, () => {
    const { clock, timer, act, notices } = setup();
    act("startBreak");
    timer.setBlocked("suspend", true);
    timer.setBlocked("lock", true);
    clock.wallTime += elapsed;
    timer.setBlocked("lock", false);
    timer.setBlocked("suspend", false);
    assert.equal(
      timer.snapshot().phase,
      elapsed < 3 * MINUTE ? "resting" : "working",
    );
    assert.equal(
      timer.snapshot().remainingMs,
      elapsed < 3 * MINUTE ? 2 * MINUTE : 35 * MINUTE,
    );
    assert.equal(notices.length, 0);
  });
test("invalid settings rejected at process boundary", () => {
  for (const workMinutes of [0, -1, 1.2, NaN, Infinity, 1441, "35"])
    assert.throws(() => parseSettings({ ...DEFAULT_SETTINGS, workMinutes }));
  assert.throws(() => parseSettings({ ...DEFAULT_SETTINGS, surprise: true }));
  assert.throws(() => parseSettings({ ...DEFAULT_SETTINGS, theme: "invalid" }));
  assert.deepEqual(parseSettings(DEFAULT_SETTINGS), DEFAULT_SETTINGS);
});
