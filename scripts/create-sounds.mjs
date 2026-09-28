import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Original tones, synthesized at build time. Frequencies, timing and envelopes
// live here so the audio can be tuned without changing notification logic.
const tones = {
  breeze: [
    [0, 523.25, 0.9],
    [0.22, 783.99, 1.1],
  ],
  bell: [
    [0, 659.25, 1.6],
    [0, 1318.51, 0.65],
  ],
  drops: [
    [0, 880, 0.35],
    [0.34, 1174.66, 0.5],
    [0.72, 1318.51, 0.6],
  ],
  pulse: [
    [0, 440, 0.45],
    [0.52, 440, 0.6],
  ],
  aurora: [
    [0, 392, 1.3],
    [0.22, 493.88, 1.3],
    [0.44, 587.33, 1.4],
  ],
};
export async function createSounds(directory) {
  await mkdir(directory, { recursive: true });
  const rate = 44100;
  for (const [id, notes] of Object.entries(tones)) {
    const length = Math.ceil(
      (Math.max(...notes.map(([start, , duration]) => start + duration)) +
        0.05) *
        rate,
    );
    const samples = new Float64Array(length);
    for (const [start, frequency, duration] of notes) {
      for (
        let i = Math.floor(start * rate);
        i < Math.min(length, Math.ceil((start + duration) * rate));
        i++
      ) {
        const time = i / rate - start;
        const envelope =
          Math.min(1, Math.max(0, time) / 0.018) *
          Math.exp((-4 * time) / duration) *
          Math.min(1, (duration - time) / 0.06);
        samples[i] +=
          envelope *
          (Math.sin(2 * Math.PI * frequency * time) +
            0.12 * Math.sin(4 * Math.PI * frequency * time));
      }
    }
    const peak = samples.reduce(
      (value, sample) => Math.max(value, Math.abs(sample)),
      0,
    );
    const wav = Buffer.alloc(44 + length * 2);
    wav.write("RIFF", 0);
    wav.writeUInt32LE(wav.length - 8, 4);
    wav.write("WAVEfmt ", 8);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(rate, 24);
    wav.writeUInt32LE(rate * 2, 28);
    wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34);
    wav.write("data", 36);
    wav.writeUInt32LE(length * 2, 40);
    for (let i = 0; i < length; i++)
      wav.writeInt16LE(
        Math.round((samples[i] / peak) * 0.28 * 32767),
        44 + i * 2,
      );
    await writeFile(join(directory, `${id}.wav`), wav);
  }
}
