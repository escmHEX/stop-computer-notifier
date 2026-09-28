import test from "node:test";
import assert from "node:assert/strict";
import { _electron as electron } from "playwright";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test(
  "five original sounds play without toasts, release players and survive UI close",
  { timeout: 30000 },
  async () => {
    const dir = await mkdtemp(join(tmpdir(), "scn-sounds-"));
    const app = await electron.launch({
      args: [".", `--user-data-dir=${dir}`],
    });
    try {
      const page = await app.firstWindow();
      await app.evaluate(({ Notification }) => {
        globalThis.toastCount = 0;
        Notification.prototype.show = () => {
          globalThis.toastCount++;
        };
      });
      for (const sound of ["breeze", "bell", "drops", "pulse", "aurora"]) {
        const result = await page.evaluate(
          (id) => window.notifier.previewSound(id),
          sound,
        );
        assert.deepEqual(result, { ok: true }, sound);
        assert.equal(
          await app.evaluate(
            ({ BrowserWindow }) => BrowserWindow.getAllWindows().length,
          ),
          1,
        );
      }
      assert.equal(await app.evaluate(() => globalThis.toastCount), 0);
      assert.deepEqual(
        await page.evaluate(() => window.notifier.previewSound("../invalid")),
        { ok: false, error: "invalidSettings" },
      );
      // Start playback without tying its lifetime to the UI's pending IPC promise.
      await page.evaluate(() => {
        void window.notifier.previewSound("aurora");
      });
      const player = await app.evaluate(
        ({ BrowserWindow }) =>
          BrowserWindow.getAllWindows().find((w) => !w.isVisible())?.id,
      );
      assert.ok(player);
      const completed = app.evaluate(async ({ BrowserWindow }, id) => {
        const window = BrowserWindow.fromId(id);
        await new Promise((resolve) => window.once("closed", resolve));
      }, player);
      await page.evaluate(() => window.notifier.closeWindow());
      await completed;
      assert.equal(
        await app.evaluate(
          ({ BrowserWindow }) => BrowserWindow.getAllWindows().length,
        ),
        0,
      );
    } finally {
      await app.close();
      await rm(dir, { recursive: true, force: true });
    }
  },
);
