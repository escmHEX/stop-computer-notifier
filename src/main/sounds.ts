import { BrowserWindow } from "electron";
import { join } from "node:path";
import type { NotificationSound, Result } from "../shared/contracts.ts";

export class Sounds {
  private stop: (() => void) | null = null;

  // Audio belongs to main, so closing the UI cannot interrupt a reminder.
  // The sandboxed player exists only during playback; no renderer stays idle.
  play(sound: NotificationSound): Promise<Result> {
    this.dispose();
    return new Promise((resolve) => {
      const player = new BrowserWindow({
        show: false,
        webPreferences: {
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
          backgroundThrottling: false,
          autoplayPolicy: "no-user-gesture-required",
        },
      });
      let finished = false;
      const finish = (ok: boolean) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        this.stop = null;
        if (!player.isDestroyed()) player.destroy();
        resolve(ok ? { ok: true } : { ok: false, error: "soundFailed" });
      };
      this.stop = () => finish(true);
      const timeout = setTimeout(() => finish(false), 10000);
      player.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
      player.webContents.on("will-navigate", (event) => event.preventDefault());
      player.webContents.once("render-process-gone", () => finish(false));
      player.once("closed", () => finish(false));
      void player
        .loadFile(join(__dirname, "audio", "index.html"), { query: { sound } })
        .then(() => player.webContents.executeJavaScript("window.playback"))
        .then((ok: unknown) => finish(ok === true))
        .catch(() => finish(false));
    });
  }

  dispose(): void {
    this.stop?.();
  }
}
