import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { SettingsStore } from "../src/main/settings-store.ts";
import { DEFAULT_SETTINGS } from "../src/shared/config.ts";
test("preferences roundtrip, atomic replacement and corrupt-file recovery", async () => {
  const dir = await mkdtemp(join(tmpdir(), "scn-store-"));
  const store = new SettingsStore(dir);
  try {
    assert.deepEqual((await store.load()).settings, DEFAULT_SETTINGS);
    await store.save(DEFAULT_SETTINGS);
    const next = {
      ...DEFAULT_SETTINGS,
      workMinutes: 47,
      language: "en" as const,
    };
    await store.save(next);
    assert.deepEqual((await store.load()).settings, next);
    await assert.rejects(store.save({ ...next, breakMinutes: 0 }));
    assert.deepEqual((await store.load()).settings, next);
    assert.deepEqual(await readdir(dir), ["settings.json"]);
    await writeFile(store.file, "corrupt");
    const recovered = await store.load();
    assert.equal(recovered.recovered, true);
    assert.deepEqual(recovered.settings, DEFAULT_SETTINGS);
    const files = await readdir(dir);
    assert.equal(files.length, 1);
    assert.equal(await readFile(join(dir, files[0]), "utf8"), "corrupt");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("version 1 preferences retain user choices when introducing sound selection", async () => {
  const dir = await mkdtemp(join(tmpdir(), "scn-migration-"));
  const store = new SettingsStore(dir);
  try {
    const { notificationSound, ...previous } = {
      ...DEFAULT_SETTINGS,
      workMinutes: 47,
      startWithWindows: true,
    };
    await writeFile(
      store.file,
      JSON.stringify({ version: 1, settings: previous }),
    );
    const loaded = await store.load();
    assert.equal(loaded.recovered, false);
    assert.equal(loaded.settings.workMinutes, 47);
    assert.equal(loaded.settings.startWithWindows, true);
    assert.equal(loaded.settings.notificationSound, "breeze");
    await store.save({ ...loaded.settings, notificationSound: "drops" });
    assert.equal(JSON.parse(await readFile(store.file, "utf8")).version, 2);
    assert.equal((await store.load()).settings.notificationSound, "drops");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
