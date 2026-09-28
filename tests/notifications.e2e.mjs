import test from "node:test";
import assert from "node:assert/strict";
import { _electron as electron } from "playwright";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test(
  "notification test waits for Windows, reports failure, previews unsaved tone and saves selection",
  { timeout: 30000 },
  async () => {
    const dir = await mkdtemp(join(tmpdir(), "scn-notice-e2e-"));
    const app = await electron.launch({
      args: [".", `--user-data-dir=${dir}`],
    });
    try {
      const page = await app.firstWindow();
      await page
        .getByRole("button", { name: "Configuración", exact: true })
        .click();
      assert.equal(await page.locator("#notification-sound option").count(), 5);
      await page.getByLabel("Tono", { exact: true }).selectOption("drops");
      await app.evaluate(({ Notification }) => {
        globalThis.originalShow = Notification.prototype.show;
        Notification.prototype.show = function () {
          globalThis.testToast = this;
        };
      });
      await page
        .getByRole("button", { name: "Probar notificación", exact: true })
        .click();
      assert.equal(
        await page
          .getByRole("button", { name: "Probando...", exact: true })
          .isDisabled(),
        true,
      );
      assert.equal(
        await page
          .getByRole("button", { name: "Escuchar sonido", exact: true })
          .isDisabled(),
        true,
      );
      assert.equal(
        (await page.evaluate(() => window.notifier.getSnapshot())).settings
          .notificationSound,
        "breeze",
      );
      assert.match(
        await app.evaluate(() => globalThis.testToast.toastXml),
        /<audio silent="true"\/>/,
      );
      await app.evaluate(() =>
        globalThis.testToast.emit("failed", {}, "test-failure"),
      );
      await page
        .getByRole("status")
        .filter({ hasText: "No se pudo mostrar" })
        .waitFor();
      await page
        .getByRole("button", { name: "Probar notificación", exact: true })
        .click();
      await page
        .getByRole("status")
        .filter({ hasText: "Windows no confirmó la prueba" })
        .waitFor();
      await page
        .getByRole("button", { name: "Probar notificación", exact: true })
        .click();
      await app.evaluate(() => globalThis.testToast.emit("show", {}));
      await page
        .getByRole("status")
        .filter({ hasText: "Windows recibió la prueba" })
        .waitFor();
      await page
        .getByRole("button", { name: "Guardar cambios", exact: true })
        .click();
      await page
        .getByRole("status")
        .filter({ hasText: "Cambios guardados" })
        .waitFor();
      assert.equal(
        (await page.evaluate(() => window.notifier.getSnapshot())).settings
          .notificationSound,
        "drops",
      );
      await page.getByRole("button", { name: "Volver", exact: true }).click();
      const layout = await page.locator(".summary").evaluate((e) => {
        const parent = e.getBoundingClientRect();
        const children = [...e.children].map((c) => c.getBoundingClientRect());
        return {
          width: parent.width,
          left: children[0].left - parent.left,
          right: parent.right - children[1].right,
          widths: children.map((c) => c.width),
        };
      });
      assert.ok(layout.left < 1 && layout.right < 1);
      assert.ok(layout.widths.every((width) => width > layout.width * 0.4));
    } finally {
      await app.close();
      await rm(dir, { recursive: true, force: true });
    }
  },
);
