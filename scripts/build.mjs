import { cp } from "node:fs/promises";
import { createSounds } from "./create-sounds.mjs";
import { build as bundle } from "esbuild";
import { build as buildWeb } from "vite";
import { resolve } from "node:path";

await bundle({
  entryPoints: { main: "src/main/index.ts", preload: "src/main/preload.ts" },
  outdir: "dist",
  outExtension: { ".js": ".cjs" },
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  external: ["electron"],
  sourcemap: false,
});
await buildWeb({
  root: "src/renderer",
  base: "./",
  build: {
    outDir: resolve("dist/renderer"),
    emptyOutDir: true,
    target: "chrome142",
  },
});

await cp("src/audio", "dist/audio", { recursive: true });
await createSounds("dist/audio/sounds");
