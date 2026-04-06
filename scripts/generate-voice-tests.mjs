/**
 * Fetch official Voxtral *built-in* voices from Mistral (`GET /v1/audio/voices`) and generate one MP3 per voice
 * using a fixed test phrase. System voices are those with `userId === null` (excludes user-cloned profiles).
 *
 * Open-weights embedding filenames are documented in `lib/mistralBuiltinVoiceMap.ts` as
 * `MISTRAL_OPEN_WEIGHTS_EMBEDDING_SLUGS` (not used as cloud `voice_id`).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Mistral } from "@mistralai/mistralai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

const PHRASE =
  "Yo, this is a test of the street vibe translation system. I am testing my tone and accent.";
const MODEL = "voxtral-mini-tts-2603";
const OUT_DIR = path.join(ROOT, "test_audio_samples");

function sanitizeFileBase(slug, name, id) {
  const raw =
    typeof slug === "string" && slug.trim() !== ""
      ? slug.trim()
      : `${(name || "voice").replace(/\s+/g, "_")}_${String(id).slice(0, 8)}`;
  return raw.replace(/[^a-zA-Z0-9_.-]/g, "_").replace(/_+/g, "_");
}

async function fetchAllVoices(client) {
  const limit = 100;
  let offset = 0;
  const all = [];
  let total = Infinity;

  while (offset < total) {
    const page = await client.audio.voices.list({ limit, offset });
    const items = page.items ?? [];
    all.push(...items);
    total = typeof page.total === "number" ? page.total : all.length;
    if (items.length === 0) break;
    offset += items.length;
    if (items.length < limit) break;
  }
  return all;
}

async function main() {
  loadEnvLocal();
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    console.error("Missing MISTRAL_API_KEY (set in .env.local or environment).");
    process.exit(1);
  }

  const includeUserClones = process.env.MISTRAL_VOICE_TEST_INCLUDE_CLONES === "1";
  const client = new Mistral({ apiKey });
  const listed = await fetchAllVoices(client);

  const targets = listed.filter((v) => {
    if (!v || typeof v.id !== "string") return false;
    if (includeUserClones) return true;
    return v.userId == null;
  });

  if (targets.length === 0) {
    console.error("No voices returned from API (check key and account).");
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  let ok = 0;
  let fail = 0;
  const usedNames = new Set();

  for (const v of targets) {
    const base = sanitizeFileBase(v.slug, v.name, v.id);
    let fname = `${base}.mp3`;
    let n = 2;
    while (usedNames.has(fname)) {
      fname = `${base}_${n}.mp3`;
      n++;
    }
    usedNames.add(fname);
    const outFile = path.join(OUT_DIR, fname);

    let lastErr = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 800 * attempt));
        const response = await client.audio.speech.complete({
          model: MODEL,
          input: PHRASE,
          voiceId: v.id,
          responseFormat: "mp3",
        });
        const audioData =
          response &&
          typeof response === "object" &&
          "audioData" in response &&
          typeof response.audioData === "string"
            ? response.audioData
            : null;
        if (!audioData) {
          lastErr = "no audioData";
          continue;
        }
        fs.writeFileSync(outFile, Buffer.from(audioData, "base64"));
        ok++;
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
        const retryable = /500|502|503|429|timeout/i.test(lastErr);
        if (!retryable || attempt === 2) break;
      }
    }
    if (lastErr) {
      console.error(`[fail] ${v.slug || v.name || v.id}: ${lastErr}`);
      fail++;
    }

    await new Promise((r) => setTimeout(r, 250));
  }

  const scope = includeUserClones ? "all listed voices" : "built-in only (userId null)";
  console.log(`Done (${scope}): ${ok} written, ${fail} failed → ${OUT_DIR}`);
  if (ok === 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
