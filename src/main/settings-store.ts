import { open, readFile, rename, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { DEFAULT_SETTINGS, parseSettings } from "../shared/config.ts";
import type { Settings } from "../shared/contracts.ts";

export class SettingsStore {
  private readonly directory: string;
  readonly file: string;
  constructor(directory: string) {
    this.directory = directory;
    this.file = join(directory, "settings.json");
  }
  async load(): Promise<{ settings: Settings; recovered: boolean }> {
    let raw: string;
    try {
      raw = await readFile(this.file, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        return { settings: { ...DEFAULT_SETTINGS }, recovered: false };
      throw error;
    }
    try {
      const data: unknown = JSON.parse(raw);
      if (
        !data ||
        typeof data !== "object" ||
        !("version" in data) ||
        (data.version !== 1 && data.version !== 2) ||
        !("settings" in data)
      )
        throw new Error("invalid-file");
      const settings = parseSettings(
        data.version === 1 && data.settings && typeof data.settings === "object"
          ? {
              ...data.settings,
              notificationSound: DEFAULT_SETTINGS.notificationSound,
            }
          : data.settings,
      );
      return { settings, recovered: false };
    } catch {
      // Preserve the invalid file for recovery instead of silently overwriting user data.
      await rename(
        this.file,
        join(this.directory, `settings.invalid-${randomUUID()}.json`),
      );
      return { settings: { ...DEFAULT_SETTINGS }, recovered: true };
    }
  }
  async save(value: Settings): Promise<void> {
    const settings = parseSettings(value);
    await mkdir(this.directory, { recursive: true });
    const temporary = join(this.directory, `settings-${randomUUID()}.tmp`);
    try {
      const file = await open(temporary, "wx");
      try {
        await file.writeFile(
          JSON.stringify({ version: 2, settings }, null, 2) + "\n",
          "utf8",
        );
        await file.sync();
      } finally {
        await file.close();
      }
      await rename(temporary, this.file);
    } finally {
      await rm(temporary, { force: true });
    }
  }
}
