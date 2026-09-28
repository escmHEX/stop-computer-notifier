import test from "node:test";
import assert from "node:assert/strict";
import { toastXml, toastAction } from "../src/shared/toast.ts";
import {
  DEFAULT_SETTINGS,
  NOTIFICATION_SOUNDS,
  parseSettings,
} from "../src/shared/config.ts";
import { BreakTimer } from "../src/core/timer.ts";

test("all five app sounds keep the native toast silent", () => {
  assert.equal(NOTIFICATION_SOUNDS.length, 5);
  for (const notificationSound of NOTIFICATION_SOUNDS) {
    const settings = parseSettings({ ...DEFAULT_SETTINGS, notificationSound });
    assert.match(toastXml(settings, "test"), /<audio silent="true"\/>/);
    assert.match(
      toastXml({ ...settings, sound: false }, "test"),
      /<audio silent="true"\/>/,
    );
  }
  assert.throws(() =>
    parseSettings({ ...DEFAULT_SETTINGS, notificationSound: "unknown" }),
  );
});
test("custom toast actions roundtrip the cycle and reject invalid actions", () => {
  const timer = new BreakTimer({
    settings: DEFAULT_SETTINGS,
    sessionId: "unique",
    clock: {
      monotonic: () => 0,
      wall: () => 0,
      schedule: () => 0,
      cancel() {},
    },
    changed() {},
    notify() {},
  });
  const oldToken = timer.snapshot().token;
  const xml = toastXml(DEFAULT_SETTINGS, "reminder", oldToken);
  const encoded = [...xml.matchAll(/arguments="([^"]+)"/g)].map((match) =>
    match[1].replaceAll("&amp;", "&"),
  );
  const start = toastAction(encoded[0])!;
  assert.equal(start.action, "startBreak");
  assert.equal(start.token, oldToken);
  assert.equal(toastAction(encoded[1])!.action, "snooze");
  assert.equal(timer.act(start.action, start.token), true);
  assert.equal(timer.act(start.action, start.token), false);
  for (const args of [
    "",
    "type=action&action=2&cycle=x",
    "type=action&action=0",
    "type=click&action=0&cycle=x",
  ])
    assert.equal(toastAction(args), null);
  assert.ok(!toastXml(DEFAULT_SETTINGS, "test").includes("<actions>"));
  assert.ok(!toastXml(DEFAULT_SETTINGS, "finished").includes("<actions>"));
});
