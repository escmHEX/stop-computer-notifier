// The main process passes a validated catalog ID, never an arbitrary URL.
const sound = new URLSearchParams(location.search).get("sound");
const audio = new Audio(`sounds/${encodeURIComponent(sound)}.wav`);
window.playback = new Promise((resolve) => {
  audio.addEventListener("ended", () => resolve(true), { once: true });
  audio.addEventListener("error", () => resolve(false), { once: true });
  audio.play().catch(() => resolve(false));
});
