import { contextBridge, ipcRenderer } from "electron";
import { IPC, type DesktopAPI, type AppSnapshot } from "../shared/contracts.ts";

const api: DesktopAPI = {
  getSnapshot: () => ipcRenderer.invoke(IPC.snapshot),
  subscribe: (listener) => {
    const receive = (
      _event: Electron.IpcRendererEvent,
      snapshot: AppSnapshot,
    ) => listener(snapshot);
    ipcRenderer.on(IPC.changed, receive);
    return () => ipcRenderer.removeListener(IPC.changed, receive);
  },
  saveSettings: (settings) => ipcRenderer.invoke(IPC.save, settings),
  act: (action, token) => ipcRenderer.invoke(IPC.action, action, token),
  testNotification: (sound, enabled) =>
    ipcRenderer.invoke(IPC.test, sound, enabled),
  previewSound: (sound) => ipcRenderer.invoke(IPC.previewSound, sound),
  openNotificationSettings: () => ipcRenderer.invoke(IPC.notificationSettings),
  closeWindow: () => ipcRenderer.invoke(IPC.close),
  minimizeWindow: () => ipcRenderer.invoke(IPC.minimize),
  clearProblem: () => ipcRenderer.invoke(IPC.clearProblem),
};
contextBridge.exposeInMainWorld("notifier", api);
