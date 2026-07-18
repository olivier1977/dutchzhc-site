// DUTA-1166: generate narration clips for the DID/VC explainer pilot from
// voiceover-script.md via the ElevenLabs TTS API.
//
// Usage:
//   node --env-file=.env scripts/generate-voiceover.mjs
//
// Reads each numbered line from the script table, calls ElevenLabs once per
// line, and writes public/audio/line-0N.mp3 (served by Remotion's staticFile()).

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SCRIPT_MD = path.join(ROOT, "voiceover-script.md");
const AUDIO_DIR = path.join(ROOT, "public", "audio");

const VOICE_ID = "onwK4e9ZLuTAKqWW03F9"; // Daniel - Steady Broadcaster
const MODEL_ID = "eleven_multilingual_v2";
const VOICE_SETTINGS = { stability: 0.45, similarity_boost: 0.8 };

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error("ELEVENLABS_API_KEY is not set. Run with: node --env-file=.env scripts/generate-voiceover.mjs");
  process.exit(1);
}

function parseLines(markdown) {
  const rows = markdown
    .split("\n")
    .filter((line) => /^\|\s*\d+\s*\|/.test(line));

  return rows.map((row) => {
    const cells = row
      .split("|")
      .map((c) => c.trim())
      .filter((_, i, arr) => i > 0 && i < arr.length - 1);
    const [num, , , text] = cells;
    const line = text.replace(/^"|"$/g, "");
    return { num: Number(num), text: line };
  });
}

async function synthesize({ num, text }) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: VOICE_SETTINGS,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`ElevenLabs TTS failed for line ${num} (${res.status}): ${detail}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const outPath = path.join(AUDIO_DIR, `line-${String(num).padStart(2, "0")}.mp3`);
  await writeFile(outPath, buffer);
  console.log(`wrote ${path.relative(ROOT, outPath)} (${buffer.length} bytes): "${text}"`);
}

async function main() {
  await mkdir(AUDIO_DIR, { recursive: true });
  const markdown = await readFile(SCRIPT_MD, "utf8");
  const lines = parseLines(markdown);

  if (lines.length === 0) {
    throw new Error(`No script rows found in ${SCRIPT_MD}`);
  }

  for (const line of lines) {
    await synthesize(line);
  }

  console.log(`Done. Generated ${lines.length} clips in ${path.relative(ROOT, AUDIO_DIR)}/`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
