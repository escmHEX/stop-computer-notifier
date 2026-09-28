import { TIMING } from "./config.ts";
import { messages, format } from "./i18n.ts";
import type { Settings, TimerAction } from "./contracts.ts";

function xml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
}
export function toastAction(
  argumentsText: string,
): { action: TimerAction; token: string } | null {
  const args = new URLSearchParams(argumentsText);
  const token = args.get("cycle");
  const index = args.get("action");
  if (
    args.get("type") !== "action" ||
    !token ||
    token.length > 100 ||
    (index !== "0" && index !== "1")
  )
    return null;
  return { action: index === "0" ? "startBreak" : "snooze", token };
}
export function toastXml(
  settings: Settings,
  kind: "reminder" | "finished" | "test",
  token = "",
  paused = false,
): string {
  const t = messages[settings.language];
  const title =
    kind === "test"
      ? t.testTitle
      : kind === "reminder"
        ? t.noticeTitle
        : t.finishTitle;
  const body =
    kind === "test"
      ? format(t.testBody, { minutes: settings.breakMinutes })
      : kind === "reminder"
        ? format(t.noticeBody, { minutes: settings.breakMinutes })
        : paused
          ? t.finishPaused
          : t.finishBody;
  // Keep the cycle
  // in activation arguments so an old or repeated button cannot change a new cycle.
  const actions =
    kind === "reminder"
      ? "<actions>" +
        [t.begin, format(t.snooze, { minutes: TIMING.snoozeMinutes })]
          .map(
            (label, index) =>
              `<action activationType="foreground" content="${xml(label)}" arguments="${xml(new URLSearchParams({ type: "action", action: String(index), cycle: token }).toString())}"/>`,
          )
          .join("") +
        "</actions>"
      : "";
  // The app owns audio, including when Do not disturb hides the banner.
  const audio = '<audio silent="true"/>';
  return `<toast launch="type=click"><visual><binding template="ToastGeneric"><text>${xml(title)}</text><text>${xml(body)}</text></binding></visual>${actions}${audio}</toast>`;
}
