import {
  app,
  BrowserWindow,
  Menu,
  Tray,
  nativeImage,
  nativeTheme,
  powerMonitor,
  ipcMain,
  Notification,
  shell,
  session,
  dialog,
  screen,
} from "electron";
import { join } from "node:path";
import { mkdirSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
import { BreakTimer } from "../core/timer.ts";
import { SettingsStore } from "./settings-store.ts";
import { Notifications } from "./notifications.ts";
import {
  APP_ID,
  PRODUCT,
  TIMING,
  parseSettings,
  NOTIFICATION_SOUNDS,
} from "../shared/config.ts";
import {
  IPC,
  type Settings,
  type AppSnapshot,
  type Problem,
  type Result,
  type TimerAction,
  type NotificationSound,
} from "../shared/contracts.ts";
import { messages, format } from "../shared/i18n.ts";

app.setName(app.isPackaged ? PRODUCT : `${PRODUCT} Development`);
app.setAppUserModelId(app.isPackaged ? APP_ID : `${APP_ID}.development`);
// A stable COM identity lets Windows activate toasts after a window has been closed.
app.setToastActivatorCLSID(
  app.isPackaged
    ? "{24C482DA-18D7-4BCE-B6A5-B91196F43621}"
    : "{24C482DA-18D7-4BCE-B6A5-B91196F43622}",
);
const ownLock = app.requestSingleInstanceLock();
if (!ownLock) app.quit();
else
  void start().catch((error: unknown) => {
    console.error(
      "[SCN] startup-failed",
      error instanceof Error ? error.message : "unknown",
    );
    dialog.showErrorBox(
      PRODUCT,
      "No se pudo iniciar la aplicación. Comprueba que puedas acceder a tus archivos de configuración.",
    );
    app.quit();
  });

async function start(): Promise<void> {
  let window: BrowserWindow | null = null;
  let tray: Tray | null = null;
  let showRequested = false;
  let quitting = false;
  let problem: Problem | null = null;
  let settings: Settings;
  let timer: BreakTimer;
  let notifications: Notifications;
  const startupAvailable = app.isPackaged && process.platform === "win32";
  const rendererFile = join(__dirname, "renderer", "index.html");
  const rendererUrl = pathToFileURL(rendererFile).href;
  const icon = join(app.getAppPath(), "assets", "icon.png");
  const loginOptions = { path: process.execPath, args: ["--background"] };
  app.on("second-instance", () => {
    showRequested = true;
    if (timer) openWindow();
  });
  app.on("activate", () => {
    if (timer) openWindow();
  });
  app.on("window-all-closed", () => {
    /* The tray owns the app lifetime. Closing the window frees its renderer. */
  });
  app.on("before-quit", () => {
    quitting = true;
    timer?.dispose();
    notifications?.dispose();
    tray?.destroy();
  });
  await app.whenReady();
  const store = new SettingsStore(app.getPath("userData"));
  const loaded = await store.load();
  settings = loaded.settings;
  if (loaded.recovered) problem = "settingsRecovered";
  if (startupAvailable)
    settings.startWithWindows =
      app.getLoginItemSettings(loginOptions).openAtLogin;
  nativeTheme.themeSource = settings.theme;

  if (app.isPackaged) {
    const programs = join(
      app.getPath("appData"),
      "Microsoft",
      "Windows",
      "Start Menu",
      "Programs",
    );
    mkdirSync(programs, { recursive: true });
    const shortcut = join(programs, `${PRODUCT}.lnk`);
    const ok = shell.writeShortcutLink(
      shortcut,
      existsSync(shortcut) ? "update" : "create",
      {
        target: process.execPath,
        cwd: join(process.execPath, ".."),
        description: PRODUCT,
        appUserModelId: APP_ID,
        toastActivatorClsid: app.toastActivatorCLSID,
      },
    );
    if (!ok) {
      problem = "notificationFailed";
      console.error("[SCN] notification-shortcut-failed");
    }
  }

  function snapshot(): AppSnapshot {
    return {
      timer: timer.snapshot(),
      settings: { ...settings },
      dark: nativeTheme.shouldUseDarkColors,
      startupAvailable,
      problem,
      version: app.getVersion(),
    };
  }
  function publish(): void {
    if (window && !window.isDestroyed() && !window.webContents.isLoading())
      window.webContents.send(IPC.changed, snapshot());
  }
  function report(value: Problem, code: string): void {
    problem = value;
    console.error(`[SCN] ${code}`);
    publish();
  }
  function rebuildTray(): void {
    if (!tray) return;
    const state = timer.snapshot();
    const t = messages[settings.language];
    const status =
      state.phase === "resting"
        ? t.resting
        : state.paused
          ? t.paused
          : state.phase === "pending"
            ? t.pending
            : state.phase === "snoozed"
              ? t.snoozed
              : t.session;
    tray.setToolTip(`${PRODUCT} - ${status}`);
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: PRODUCT, enabled: false },
        { label: status, enabled: false },
        { type: "separator" },
        { label: t.open, click: openWindow },
        {
          label: state.paused ? t.resume : t.pause,
          click: () =>
            act(state.paused ? "resume" : "pause", timer.snapshot().token),
        },
        {
          label: t.restart,
          enabled: !state.blocked,
          click: () => act("restart", timer.snapshot().token),
        },
        {
          label: t.begin,
          enabled: state.phase !== "resting",
          click: () => act("startBreak", timer.snapshot().token),
        },
        ...(state.phase === "pending" && !state.paused
          ? [
              {
                label: format(t.snooze, { minutes: TIMING.snoozeMinutes }),
                click: () => act("snooze", timer.snapshot().token),
              },
            ]
          : []),
        { type: "separator" },
        { label: t.quit, click: () => app.quit() },
      ]),
    );
  }
  function act(action: TimerAction, token: string): void {
    timer.act(action, token);
  }
  notifications = new Notifications(
    act,
    () => report("notificationFailed", "notification-failed"),
    openWindow,
    () => report("soundFailed", "sound-playback-failed"),
  );
  timer = new BreakTimer({
    settings,
    sessionId: randomUUID(),
    clock: {
      monotonic: () => performance.now(),
      wall: () => Date.now(),
      schedule: (fn, ms) => setTimeout(fn, ms),
      cancel: (handle) => clearTimeout(handle as NodeJS.Timeout),
    },
    changed: () => {
      notifications.clear();
      publish();
      rebuildTray();
    },
    notify: (kind, state) => notifications.show(kind, state, settings),
  });

  session.defaultSession.setPermissionRequestHandler(
    (_contents, _permission, callback) => callback(false),
  );
  session.defaultSession.setPermissionCheckHandler(() => false);
  Notification.handleActivation((details) => {
    if (details.type === "click") openWindow();
    else if (details.type === "action")
      notifications.activate(details.arguments);
  });
  function openWindow(): void {
    if (quitting) return;
    if (window && !window.isDestroyed()) {
      if (window.isMinimized()) window.restore();
      window.show();
      window.focus();
      publish();
      return;
    }
    const area = screen.getPrimaryDisplay().workAreaSize;
    window = new BrowserWindow({
      title: PRODUCT,
      width: Math.min(460, area.width),
      height: Math.min(746, area.height),
      minWidth: 340,
      minHeight: 460,
      frame: false,
      resizable: true,
      maximizable: false,
      show: false,
      autoHideMenuBar: true,
      icon,
      backgroundColor: nativeTheme.shouldUseDarkColors ? "#172333" : "#f5f8fc",
      webPreferences: {
        preload: join(__dirname, "preload.cjs"),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        spellcheck: false,
        devTools: !app.isPackaged,
      },
    });
    window.setMenu(null);
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    window.webContents.on("will-navigate", (event) => event.preventDefault());
    window.once("ready-to-show", () => {
      window?.show();
    });
    window.on("closed", () => {
      window = null;
    });
    void window
      .loadFile(rendererFile)
      .catch(() => report("loadFailed", "window-load-failed"));
  }
  function trusted(event: Electron.IpcMainInvokeEvent): void {
    if (
      !window ||
      event.sender !== window.webContents ||
      event.senderFrame !== window.webContents.mainFrame ||
      event.senderFrame.url !== rendererUrl
    )
      throw new Error("Untrusted request");
  }
  function handle(
    channel: string,
    callback: (...args: unknown[]) => unknown,
  ): void {
    ipcMain.handle(channel, (event, ...args: unknown[]) => {
      trusted(event);
      return callback(...args);
    });
  }
  let saveQueue = Promise.resolve<Result>({ ok: true });
  async function saveSettings(value: unknown): Promise<Result> {
    let next: Settings;
    try {
      next = parseSettings(value);
    } catch {
      return { ok: false, error: "invalidSettings" };
    }
    const startupChanged = next.startWithWindows !== settings.startWithWindows;
    if (startupChanged && !startupAvailable)
      return { ok: false, error: "startupUnavailable" };
    try {
      if (startupChanged) {
        app.setLoginItemSettings({
          ...loginOptions,
          openAtLogin: next.startWithWindows,
        });
        if (
          app.getLoginItemSettings(loginOptions).openAtLogin !==
          next.startWithWindows
        )
          throw new Error("startup-failed");
      }
      await store.save(next);
    } catch {
      if (startupChanged) {
        try {
          app.setLoginItemSettings({
            ...loginOptions,
            openAtLogin: settings.startWithWindows,
          });
        } catch {
          console.error("[SCN] startup-rollback-failed");
        }
      }
      report("saveFailed", "settings-save-failed");
      return { ok: false, error: "saveFailed" };
    }
    settings = next;
    timer.configure(settings);
    nativeTheme.themeSource = settings.theme;
    if (problem === "saveFailed") problem = null;
    publish();
    rebuildTray();
    return { ok: true };
  }
  handle(IPC.snapshot, snapshot);
  handle(IPC.save, (value) => {
    saveQueue = saveQueue.then(() => saveSettings(value));
    return saveQueue;
  });
  handle(IPC.action, (action, token) => {
    if (
      !["startBreak", "snooze", "pause", "resume", "restart"].includes(
        String(action),
      ) ||
      typeof token !== "string" ||
      token.length > 100
    )
      throw new Error("Invalid action");
    act(action as TimerAction, token);
  });
  handle(IPC.previewSound, (sound): Promise<Result> | Result => {
    if (!NOTIFICATION_SOUNDS.includes(sound as NotificationSound))
      return { ok: false, error: "invalidSettings" };
    return notifications.previewSound(sound as NotificationSound);
  });
  handle(IPC.test, (sound, enabled): Promise<Result> | Result => {
    if (
      !NOTIFICATION_SOUNDS.includes(sound as NotificationSound) ||
      typeof enabled !== "boolean"
    )
      return { ok: false, error: "invalidSettings" };
    return notifications.test({
      ...settings,
      notificationSound: sound as NotificationSound,
      sound: enabled,
    });
  });
  handle(IPC.notificationSettings, () =>
    shell.openExternal("ms-settings:notifications"),
  );
  handle(IPC.close, () => {
    const closing = window;
    setImmediate(() => closing?.close());
  });
  handle(IPC.minimize, () => window?.minimize());
  handle(IPC.clearProblem, () => {
    problem = null;
    publish();
  });
  nativeTheme.on("updated", publish);
  powerMonitor.on("lock-screen", () => timer.setBlocked("lock", true));
  powerMonitor.on("unlock-screen", () => timer.setBlocked("lock", false));
  powerMonitor.on("suspend", () => timer.setBlocked("suspend", true));
  powerMonitor.on("resume", () => {
    timer.setBlocked("lock", powerMonitor.getSystemIdleState(1) === "locked");
    timer.setBlocked("suspend", false);
  });
  if (powerMonitor.getSystemIdleState(1) === "locked")
    timer.setBlocked("lock", true);
  tray = new Tray(
    nativeImage.createFromPath(icon).resize({ width: 20, height: 20 }),
  );
  tray.on("click", openWindow);
  tray.on("double-click", openWindow);
  rebuildTray();
  if (showRequested || !process.argv.includes("--background")) openWindow();
}
