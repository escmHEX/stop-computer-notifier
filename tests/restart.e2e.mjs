import test from "node:test";
import assert from "node:assert/strict";
import { _electron as electron } from "playwright";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test(
  "restart works from keyboard and tray, preserves pause and rest, and fits narrow windows",
  { timeout: 30000 },
  async () => {
    const dir = await mkdtemp(join(tmpdir(), "scn-restart-"));
    const app = await electron.launch({
      args: [".", `--user-data-dir=${dir}`],
    });
    try {
      const page = await app.firstWindow();
      await app.evaluate(({ Tray }) => {
        const original = Tray.prototype.setContextMenu;
        Tray.prototype.setContextMenu = function (menu) {
          globalThis.testMenu = menu;
          return original.call(this, menu);
        };
      });
      await page.evaluate(async () => {
        const { settings } = await window.notifier.getSnapshot();
        await window.notifier.saveSettings({
          ...settings,
          workMinutes: 47,
          breakMinutes: 6,
        });
      });
      await page.getByRole("button", { name: "Pausar", exact: true }).click();
      await page
        .getByRole("button", { name: "Reanudar", exact: true })
        .waitFor();
      const before = await page.evaluate(() => window.notifier.getSnapshot());
      const restart = page.getByRole("button", {
        name: "Reiniciar contador",
        exact: true,
      });
      await restart.focus();
      await page.keyboard.press("Enter");
      await page.waitForFunction(
        () => document.querySelector(".count").textContent === "47:00",
      );
      let state = await page.evaluate(() => window.notifier.getSnapshot());
      assert.equal(state.timer.remainingMs, 47 * 60000);
      assert.equal(state.timer.paused, true);
      await page.evaluate(
        (token) => window.notifier.act("startBreak", token),
        before.timer.token,
      );
      assert.equal(
        (await page.evaluate(() => window.notifier.getSnapshot())).timer.phase,
        "working",
      );
      await page
        .getByRole("button", { name: "Descansar ahora", exact: true })
        .click();
      await page.evaluate(async () => {
        const { settings } = await window.notifier.getSnapshot();
        await window.notifier.saveSettings({ ...settings, breakMinutes: 7 });
      });
      await restart.click();
      await page.waitForFunction(
        () => document.querySelector(".count").textContent === "07:00",
      );
      state = await page.evaluate(() => window.notifier.getSnapshot());
      assert.equal(state.timer.phase, "resting");
      assert.equal(state.timer.durationMs, 7 * 60000);
      assert.equal(state.timer.paused, true);
      assert.ok(state.timer.remainingMs > 7 * 60000 - 2000);
      await page.evaluate(async () => {
        const { settings } = await window.notifier.getSnapshot();
        await window.notifier.saveSettings({
          ...settings,
          breakMinutes: 8,
          language: "en",
          theme: "light",
        });
      });
      await page
        .getByRole("button", { name: "Restart timer", exact: true })
        .waitFor();
      assert.equal(
        await app.evaluate(() => {
          const item = globalThis.testMenu.items.find(
            (item) => item.label === "Restart timer",
          );
          if (!item?.enabled) return false;
          item.click();
          return true;
        }),
        true,
      );
      assert.equal(
        (await page.evaluate(() => window.notifier.getSnapshot())).timer
          .durationMs,
        8 * 60000,
      );
      // Restart is disabled while locked; rest controls also fit narrow windows.
      await app.evaluate(({ powerMonitor }) =>
        powerMonitor.emit("lock-screen"),
      );
      assert.equal(
        await page
          .getByRole("button", { name: "Restart timer", exact: true })
          .isDisabled(),
        true,
      );
      await app.evaluate(({ powerMonitor }) =>
        powerMonitor.emit("unlock-screen"),
      );
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].setSize(340, 746),
      );
      const bounds = await page.locator(".actions").evaluate((el) => {
        const buttons = [...el.querySelectorAll("button")].map((button) =>
          button.getBoundingClientRect(),
        );
        return {
          width: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
          buttons: buttons.map((r) => ({
            left: r.left,
            right: r.right,
            top: r.top,
            bottom: r.bottom,
          })),
        };
      });
      assert.ok(bounds.scroll <= bounds.width);
      assert.ok(
        bounds.buttons.every((r) => r.left >= 0 && r.right <= bounds.width),
      );
      assert.equal(bounds.buttons[0].top, bounds.buttons[1].top);
    } finally {
      await app.close();
      await rm(dir, { recursive: true, force: true });
    }
  },
);
