import test from "node:test";
import assert from "node:assert/strict";
import { _electron as electron } from "playwright";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import electronPath from "electron";

test(
  "desktop settings, isolation, lock events, window recreation and background deadline",
  { timeout: 100000 },
  async () => {
    const dir = await mkdtemp(join(tmpdir(), "scn-e2e-"));
    let app;
    try {
      app = await electron.launch({ args: [".", `--user-data-dir=${dir}`] });
      let page = await app.firstWindow();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page
        .getByRole("button", { name: "Configuración", exact: true })
        .click();
      await page
        .getByRole("spinbutton", { name: "Intervalo de trabajo" })
        .fill("1");
      await page
        .getByRole("spinbutton", { name: "Duración del descanso" })
        .fill("1");
      await page.getByLabel("Idioma", { exact: true }).selectOption("en");
      await page
        .getByLabel("Apariencia", { exact: true })
        .selectOption("light");
      await page.getByRole("button", { name: "Guardar cambios" }).click();
      await page.getByRole("button", { name: "Back", exact: true }).click();
      assert.match(
        await page.locator(".summary").innerText(),
        /1 min in session/,
      );
      assert.equal(
        await page
          .locator(".count")
          .evaluate((e) => getComputedStyle(e).fontStyle),
        "normal",
      );
      assert.equal(
        await page.evaluate(() => typeof window.require),
        "undefined",
      );
      let state = await page.evaluate(() => window.notifier.getSnapshot());
      assert.equal(state.timer.durationMs, 35 * 60000);
      assert.equal(state.dark, false);
      assert.equal(
        (await page.evaluate(() => window.notifier.saveSettings({}))).ok,
        false,
      );
      await app.evaluate(({ powerMonitor }) => {
        powerMonitor.emit("lock-screen");
        powerMonitor.emit("suspend");
        powerMonitor.emit("unlock-screen");
      });
      state = await page.evaluate(() => window.notifier.getSnapshot());
      assert.equal(state.timer.blocked, true);
      await app.evaluate(({ powerMonitor }) => powerMonitor.emit("resume"));
      state = await page.evaluate(() => window.notifier.getSnapshot());
      assert.equal(state.timer.durationMs, 60000);
      await page.getByRole("button", { name: "Pause", exact: true }).click();
      state = await page.evaluate(() => window.notifier.getSnapshot());
      assert.equal(state.timer.paused, true);
      await page.getByRole("button", { name: "Resume", exact: true }).click();
      await page
        .getByRole("button", { name: "Take a break", exact: true })
        .click();
      state = await page.evaluate(() => window.notifier.getSnapshot());
      assert.equal(state.timer.phase, "resting");
      const closed = page.waitForEvent("close");
      await page
        .getByRole("button", {
          name: "Close and keep running in the background",
        })
        .click();
      await closed;
      assert.equal(
        await app.evaluate(
          ({ BrowserWindow }) => BrowserWindow.getAllWindows().length,
        ),
        0,
      );
      const baseline = await app.evaluate(({ app }) => app.getAppMetrics());
      console.log(
        "closed-window processes",
        baseline.map((p) => ({
          type: p.type,
          memoryKB: p.memory.workingSetSize,
        })),
      );
      await new Promise((resolve) => setTimeout(resolve, 61500));
      const metrics = await app.evaluate(({ app }) => app.getAppMetrics());
      console.log(
        "idle CPU percent",
        metrics.map((p) => ({
          type: p.type,
          cpu: p.cpu.percentCPUUsage,
          memoryKB: p.memory.workingSetSize,
        })),
      );
      const opened = app.waitForEvent("window");
      const second = spawn(electronPath, [".", `--user-data-dir=${dir}`], {
        windowsHide: true,
        stdio: "ignore",
      });
      page = await opened;
      await page
        .getByRole("button", { name: "Settings", exact: true })
        .waitFor();
      state = await page.evaluate(() => window.notifier.getSnapshot());
      assert.equal(state.timer.phase, "working");
      assert.equal(state.settings.workMinutes, 1);
      assert.equal(
        await app.evaluate(
          ({ BrowserWindow }) => BrowserWindow.getAllWindows().length,
        ),
        1,
      );
      if (second.exitCode === null)
        await new Promise((resolve) => second.once("exit", resolve));
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      await page.getByLabel("Appearance", { exact: true }).selectOption("dark");
      await page.getByLabel("Language", { exact: true }).selectOption("es");
      await page.getByRole("button", { name: "Save changes" }).click();
      await page.getByRole("button", { name: "Volver" }).click();
      assert.equal(
        await page.locator("html").getAttribute("data-theme"),
        "dark",
      );
      assert.deepEqual(errors, []);
    } finally {
      if (app) await app.close();
      await rm(dir, { recursive: true, force: true });
    }
  },
);
