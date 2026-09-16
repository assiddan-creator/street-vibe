#!/usr/bin/env node
/**
 * Street Vibe — official ElevenLabs voice audit.
 *
 * Queries the official ElevenLabs API to build candidate voice lists for every
 * premium Street Vibe city. Nothing here trusts a third-party catalogue: a voice
 * only becomes a candidate if the official API reports metadata that supports it.
 *
 * Endpoints used (official):
 *   GET https://api.elevenlabs.io/v1/shared-voices   — Voice Library search
 *   GET https://api.elevenlabs.io/v1/voices          — own + premade voices
 *   GET https://api.elevenlabs.io/v1/voices/{id}     — validate a specific ID
 *
 * The API key is read from the server environment (or .env.local) and is NEVER
 * printed, logged, or written to the JSON report.
 *
 * Usage:
 *   node scripts/audit-elevenlabs-voices.mjs                 # audit all cities
 *   node scripts/audit-elevenlabs-voices.mjs --city Kingston # one city
 *   node scripts/audit-elevenlabs-voices.mjs --verify <id>   # validate one voice id
 *   node scripts/audit-elevenlabs-voices.mjs --premade       # list own/premade voices
 *   node scripts/audit-elevenlabs-voices.mjs --json out.json # write full report
 *   node scripts/audit-elevenlabs-voices.mjs --top 8         # candidates per gender
 */

import fs from "node:fs";
import path from "node:path";

const API = "https://api.elevenlabs.io/v1";

/* ------------------------------------------------------------------ *
 * Key loading — never printed.
 * ------------------------------------------------------------------ */

function loadApiKey() {
  if (process.env.ELEVENLABS_API_KEY?.trim()) {
    return process.env.ELEVENLABS_API_KEY.trim();
  }
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return null;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq).trim() !== "ELEVENLABS_API_KEY") continue;
    const raw = trimmed.slice(eq + 1).trim();
    return raw.replace(/^["']|["']$/g, "") || null;
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * City targets — internal IDs must match lib/elevenLabsVoices.ts.
 * ------------------------------------------------------------------ */

const MIN_NOTICE_DAYS = 30;

/**
 * `queries` are tried in order and the results merged. Earlier queries are the
 * more specific ones, so a voice found by a precise query also picks up the
 * looser query's ranking signal without being dropped.
 */
const CITY_TARGETS = [
  {
    city: "Kingston",
    internalId: "Jamaican Patois",
    language: "en",
    preferredLocales: ["en-JM"],
    preferredAccents: ["jamaican", "caribbean"],
    rejectAccents: ["american", "british", "received pronunciation", "indian", "australian"],
    note: "Real Jamaican/Patois-capable. Reject generic American or British reading Jamaican text.",
    queries: [
      { language: "en", accent: "jamaican" },
      { language: "en", locale: "en-JM" },
    ],
  },
  {
    city: "London",
    internalId: "London Roadman",
    language: "en",
    preferredLocales: ["en-GB"],
    preferredAccents: ["british", "cockney", "london", "estuary", "multicultural london english"],
    rejectAccents: ["american", "us southern", "us midwest", "new york", "canadian", "indian", "australian"],
    // RP is formal BBC English — explicitly undesirable for a roadman register.
    demoteAccents: ["received pronunciation", "scottish", "welsh", "irish"],
    note: "Young modern London conversational. Not American. Avoid formal RP.",
    queries: [
      { language: "en", accent: "cockney" },
      { language: "en", accent: "london" },
      { language: "en", locale: "en-GB", age: "young", use_cases: "conversational" },
      { language: "en", locale: "en-GB", age: "young", use_cases: "social_media" },
      { language: "en", accent: "british", age: "young" },
    ],
  },
  {
    city: "Brooklyn",
    internalId: "New York Brooklyn",
    language: "en",
    preferredLocales: ["en-US"],
    preferredAccents: ["new york", "brooklyn", "new york city"],
    rejectAccents: ["british", "received pronunciation", "australian", "indian", "jamaican"],
    // Generic American is the documented failure mode here: allowed only as a fallback.
    demoteAccents: ["american", "us southern", "us midwest"],
    note: "Contemporary NYC / New York Metro. Generic American is NOT Brooklyn.",
    queries: [
      { language: "en", accent: "new york" },
      { language: "en", accent: "brooklyn" },
      { language: "en", locale: "en-US", age: "young", use_cases: "conversational" },
    ],
  },
  {
    city: "Tokyo",
    internalId: "Tokyo Gyaru",
    language: "ja",
    preferredLocales: ["ja-JP"],
    // Kanto is the Tokyo region; standard Japanese is Tokyo-based and acceptable.
    preferredAccents: ["kanto", "tokyo", "standard"],
    rejectAccents: ["kansai", "okinawa", "tohoku", "kyushu"],
    note: "Native contemporary young Japanese. Kanto = Tokyo region.",
    queries: [
      { language: "ja", accent: "kanto", age: "young" },
      { language: "ja", accent: "kanto" },
      { language: "ja", locale: "ja-JP", age: "young", use_cases: "conversational" },
      { language: "ja", locale: "ja-JP", age: "young", use_cases: "social_media" },
    ],
  },
  {
    city: "Paris",
    internalId: "Paris Banlieue",
    language: "fr",
    preferredLocales: ["fr-FR"],
    preferredAccents: ["parisian", "standard"],
    rejectAccents: ["quebec", "canadian", "african", "creole", "swiss", "belgian"],
    note: "French from France. Young conversational metropolitan. NOT Canadian French.",
    queries: [
      { language: "fr", accent: "parisian", age: "young" },
      { language: "fr", accent: "parisian" },
      { language: "fr", locale: "fr-FR", age: "young", use_cases: "conversational" },
      { language: "fr", locale: "fr-FR", age: "young", use_cases: "social_media" },
    ],
  },
  {
    city: "Moscow",
    internalId: "Russian Street",
    language: "ru",
    preferredLocales: ["ru-RU"],
    preferredAccents: ["moscow", "standard"],
    rejectAccents: ["saint petersburg"],
    note: "Native contemporary Russian, young conversational.",
    queries: [
      { language: "ru", accent: "moscow", age: "young" },
      { language: "ru", accent: "moscow" },
      { language: "ru", locale: "ru-RU", age: "young", use_cases: "conversational" },
      { language: "ru", locale: "ru-RU", age: "young", use_cases: "social_media" },
    ],
  },
  {
    city: "Mexico City",
    internalId: "Mexico City Barrio",
    language: "es",
    preferredLocales: ["es-MX"],
    preferredAccents: ["mexican"],
    rejectAccents: [
      "peninsular", "castilian", "argentine", "colombian", "chilean", "peruvian",
      "venezuelan", "cuban", "caribbean", "canary islands", "puerto rican",
    ],
    demoteAccents: ["latin american"],
    note: "Native Mexican Spanish. NOT Spain.",
    queries: [
      { language: "es", locale: "es-MX", accent: "mexican", age: "young" },
      { language: "es", accent: "mexican" },
      { language: "es", locale: "es-MX", age: "young", use_cases: "conversational" },
      { language: "es", locale: "es-MX", use_cases: "social_media" },
    ],
  },
  {
    city: "Rio",
    internalId: "Rio Favela",
    language: "pt",
    preferredLocales: ["pt-BR"],
    // "carioca" is the Rio-specific label; only counts if the API actually reports it.
    preferredAccents: ["carioca", "rio de janeiro", "brazilian"],
    rejectAccents: ["european", "portuguese", "african"],
    note: "Brazilian Portuguese. Never infer Rio merely from 'Brazilian'. Never European Portuguese.",
    queries: [
      { language: "pt", accent: "carioca" },
      { language: "pt", locale: "pt-BR", accent: "brazilian", age: "young", use_cases: "conversational" },
      { language: "pt", locale: "pt-BR", age: "young", use_cases: "social_media" },
      { language: "pt", locale: "pt-BR", age: "young" },
    ],
  },
  {
    city: "Tel Aviv",
    internalId: "Israeli Street",
    language: "he",
    preferredLocales: ["he-IL"],
    preferredAccents: ["israeli", "standard"],
    rejectAccents: [],
    note: "Native Modern Israeli Hebrew. Do not label a voice Israeli merely because it can pronounce Hebrew.",
    queries: [
      { language: "he" },
      { search: "hebrew" },
      { search: "israeli" },
    ],
  },
  {
    city: "Cairo",
    internalId: "Arabic Egyptian",
    language: "ar",
    preferredLocales: ["ar-EG"],
    preferredAccents: ["egyptian", "cairene"],
    rejectAccents: ["saudi", "gulf", "kuwaiti", "omani", "iraqi", "levantine", "jordanian", "moroccan", "algerian"],
    demoteAccents: ["modern standard"],
    note: "Egyptian Arabic / Cairene. Reject Gulf. Formal MSA only if no regional option.",
    queries: [
      { language: "ar", locale: "ar-EG", accent: "egyptian", age: "young" },
      { language: "ar", accent: "egyptian" },
      { language: "ar", locale: "ar-EG", use_cases: "conversational" },
      { language: "ar", locale: "ar-EG", use_cases: "social_media" },
    ],
  },
  {
    city: "Madrid",
    internalId: "Spanish Madrid",
    language: "es",
    preferredLocales: ["es-ES"],
    preferredAccents: ["peninsular", "castilian", "madrid"],
    rejectAccents: [
      "mexican", "latin american", "argentine", "colombian", "chilean", "peruvian",
      "venezuelan", "cuban", "caribbean", "puerto rican",
    ],
    demoteAccents: ["canary islands"],
    note: "Spain / Castilian. Young conversational. Reject Latin American.",
    queries: [
      { language: "es", locale: "es-ES", accent: "peninsular", age: "young" },
      { language: "es", accent: "peninsular" },
      { language: "es", locale: "es-ES", age: "young", use_cases: "conversational" },
      { language: "es", locale: "es-ES", use_cases: "social_media" },
    ],
  },
];

/* ------------------------------------------------------------------ *
 * API helpers
 * ------------------------------------------------------------------ */

function authHeaders(key) {
  return { "xi-api-key": key, Accept: "application/json" };
}

async function getSharedVoices(key, params, pageSize = 100) {
  const url = new URL(`${API}/shared-voices`);
  url.searchParams.set("page_size", String(pageSize));
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { headers: authHeaders(key) });
  if (!res.ok) {
    return { ok: false, status: res.status, voices: [], total_count: 0, query: params };
  }
  const json = await res.json();
  return {
    ok: true,
    status: 200,
    voices: json.voices ?? [],
    total_count: json.total_count ?? 0,
    query: params,
  };
}

async function getVoice(key, voiceId) {
  const res = await fetch(`${API}/voices/${encodeURIComponent(voiceId)}`, {
    headers: authHeaders(key),
  });
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true, status: 200, voice: await res.json() };
}

async function getOwnVoices(key) {
  const res = await fetch(`${API}/voices?page_size=100`, { headers: authHeaders(key) });
  if (!res.ok) return { ok: false, status: res.status, voices: [] };
  const json = await res.json();
  return { ok: true, status: 200, voices: json.voices ?? [] };
}

/* ------------------------------------------------------------------ *
 * Scoring
 * ------------------------------------------------------------------ */

const norm = (v) => (typeof v === "string" ? v.trim().toLowerCase() : "");

function scoreVoice(voice, target) {
  const accent = norm(voice.accent);
  const locale = norm(voice.locale);
  const age = norm(voice.age);
  const useCase = norm(voice.use_case);
  const category = norm(voice.category);
  const notice = typeof voice.notice_period === "number" ? voice.notice_period : null;

  const reasons = [];
  let score = 0;

  // Hard rejects -------------------------------------------------
  if (norm(voice.language) !== norm(target.language)) {
    return { score: -1, rejected: true, reasons: [`language ${voice.language} != ${target.language}`], notice };
  }
  const rejectAccents = (target.rejectAccents ?? []).map(norm);
  if (accent && rejectAccents.includes(accent)) {
    return { score: -1, rejected: true, reasons: [`rejected accent "${voice.accent}"`], notice };
  }

  // Accent / locale ---------------------------------------------
  const preferredAccents = (target.preferredAccents ?? []).map(norm);
  const demoteAccents = (target.demoteAccents ?? []).map(norm);
  const accentRank = preferredAccents.indexOf(accent);
  if (accentRank === 0) {
    score += 60;
    reasons.push(`exact target accent "${voice.accent}"`);
  } else if (accentRank > 0) {
    score += 45 - accentRank * 8;
    reasons.push(`accepted accent "${voice.accent}"`);
  } else if (demoteAccents.includes(accent)) {
    score += 5;
    reasons.push(`weak/generic accent "${voice.accent}" (fallback only)`);
  }

  if ((target.preferredLocales ?? []).map(norm).includes(locale)) {
    score += 25;
    reasons.push(`locale ${voice.locale}`);
  }

  // Style fit ----------------------------------------------------
  if (age === "young") {
    score += 18;
    reasons.push("young");
  } else if (age === "middle_aged") {
    score += 4;
  }
  if (useCase === "conversational") {
    score += 16;
    reasons.push("conversational");
  } else if (useCase === "social_media") {
    score += 14;
    reasons.push("social_media");
  } else if (useCase === "narrative_story" || useCase === "informative_educational") {
    score -= 6;
  }
  if (category === "professional") {
    score += 8;
    reasons.push("professional");
  } else if (category === "high_quality") {
    score += 6;
    reasons.push("high_quality");
  }

  // Stability ----------------------------------------------------
  if (notice === null) {
    score -= 12;
    reasons.push("NO notice period");
  } else if (notice >= 365) {
    score += 14;
    reasons.push(`notice ${notice}d`);
  } else if (notice >= 90) {
    score += 9;
    reasons.push(`notice ${notice}d`);
  } else if (notice >= MIN_NOTICE_DAYS) {
    score += 4;
    reasons.push(`notice ${notice}d`);
  } else {
    score -= 8;
    reasons.push(`short notice ${notice}d`);
  }

  // Verified language entries are an official quality signal.
  const verified = Array.isArray(voice.verified_languages) ? voice.verified_languages : [];
  if (verified.some((v) => norm(v.language) === norm(target.language))) {
    score += 10;
    reasons.push("verified_languages");
  }
  if (voice.featured) {
    score += 3;
    reasons.push("featured");
  }

  return { score, rejected: false, reasons, notice };
}

/** Only safe, non-secret metadata ever leaves this script. */
function safeVoice(voice, scored) {
  const verified = Array.isArray(voice.verified_languages) ? voice.verified_languages : [];
  return {
    name: voice.name,
    voice_id: voice.voice_id,
    gender: voice.gender ?? null,
    age: voice.age || null,
    language: voice.language ?? null,
    locale: voice.locale ?? null,
    accent: voice.accent ?? null,
    category: voice.category ?? null,
    use_case: voice.use_case || null,
    descriptive: voice.descriptive || null,
    description: voice.description || null,
    verified_languages: verified.map((v) => ({
      language: v.language,
      locale: v.locale ?? null,
      accent: v.accent ?? null,
      model_id: v.model_id ?? null,
    })),
    notice_period_days: scored.notice,
    free_users_allowed: voice.free_users_allowed ?? null,
    featured: Boolean(voice.featured),
    cloned_by_count: voice.cloned_by_count ?? null,
    preview_url: voice.preview_url ?? null,
    score: scored.score,
    reasons: scored.reasons,
  };
}

/* ------------------------------------------------------------------ *
 * Audit
 * ------------------------------------------------------------------ */

async function auditCity(key, target, topN) {
  const seen = new Map();
  const queryLog = [];

  for (const q of target.queries) {
    const result = await getSharedVoices(key, q);
    queryLog.push({
      query: q,
      ok: result.ok,
      status: result.status,
      total_count: result.total_count,
      returned: result.voices.length,
    });
    if (!result.ok) continue;
    for (const voice of result.voices) {
      if (!seen.has(voice.voice_id)) seen.set(voice.voice_id, voice);
    }
  }

  const scoredAll = [];
  for (const voice of seen.values()) {
    const scored = scoreVoice(voice, target);
    if (scored.rejected) continue;
    if (scored.notice !== null && scored.notice < MIN_NOTICE_DAYS) {
      // keep, but it is already penalised; surfaced so the reason is visible
    }
    scoredAll.push(safeVoice(voice, scored));
  }
  scoredAll.sort((a, b) => b.score - a.score);

  const byGender = (g) => scoredAll.filter((v) => norm(v.gender) === g).slice(0, topN);

  return {
    city: target.city,
    internalId: target.internalId,
    language: target.language,
    preferredLocales: target.preferredLocales,
    note: target.note,
    queries: queryLog,
    uniqueVoicesSeen: seen.size,
    candidatesAfterFilter: scoredAll.length,
    male: byGender("male"),
    female: byGender("female"),
  };
}

/* ------------------------------------------------------------------ *
 * Reporting
 * ------------------------------------------------------------------ */

function printVoice(v, indent = "     ") {
  console.log(`${indent}${v.name}`);
  console.log(`${indent}  voice_id          ${v.voice_id}`);
  console.log(
    `${indent}  gender/age        ${v.gender ?? "-"} / ${v.age ?? "-"}`
  );
  console.log(
    `${indent}  language/locale   ${v.language ?? "-"} / ${v.locale ?? "-"}   accent: ${v.accent ?? "-"}`
  );
  console.log(
    `${indent}  category/use_case ${v.category ?? "-"} / ${v.use_case ?? "-"}`
  );
  if (v.descriptive) console.log(`${indent}  descriptive       ${v.descriptive}`);
  if (v.description) console.log(`${indent}  description       ${v.description.slice(0, 110)}`);
  const vl = v.verified_languages.length
    ? `${v.verified_languages.length} entries (${[...new Set(v.verified_languages.map((x) => x.language))].join(",")})`
    : "none";
  console.log(`${indent}  verified_langs    ${vl}`);
  console.log(
    `${indent}  notice_period     ${v.notice_period_days === null ? "NULL (no notice period)" : `${v.notice_period_days} days`}`
  );
  console.log(`${indent}  preview_url       ${v.preview_url ?? "-"}`);
  console.log(`${indent}  score             ${v.score}  [${v.reasons.join("; ")}]`);
  console.log("");
}

function printCity(report) {
  console.log("\n" + "=".repeat(74));
  console.log(`CITY: ${report.city}   INTERNAL_ID: ${report.internalId}   LANG: ${report.language}`);
  console.log(`TARGET: ${report.note}`);
  console.log("=".repeat(74));
  for (const q of report.queries) {
    console.log(
      `  query ${JSON.stringify(q.query)} -> ${q.ok ? `total_count=${q.total_count} returned=${q.returned}` : `HTTP ${q.status}`}`
    );
  }
  console.log(
    `  unique voices seen: ${report.uniqueVoicesSeen}   candidates after filter: ${report.candidatesAfterFilter}`
  );

  if (!report.male.length && !report.female.length) {
    console.log("\n  *** NO VERIFIED CANDIDATE — leave NULL and use the global fallback. ***\n");
    return;
  }
  console.log(`\n  -- MALE (${report.male.length}) --\n`);
  if (!report.male.length) console.log("     (none)\n");
  report.male.forEach((v) => printVoice(v));
  console.log(`  -- FEMALE (${report.female.length}) --\n`);
  if (!report.female.length) console.log("     (none)\n");
  report.female.forEach((v) => printVoice(v));
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

function parseArgs(argv) {
  const args = { city: null, verify: null, json: null, top: 6, premade: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--city") args.city = argv[++i];
    else if (a === "--verify") args.verify = argv[++i];
    else if (a === "--json") args.json = argv[++i];
    else if (a === "--top") args.top = Number(argv[++i]) || 6;
    else if (a === "--premade") args.premade = true;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const key = loadApiKey();
  if (!key) {
    console.error(
      "ELEVENLABS_API_KEY not found in the environment or .env.local. Nothing was queried."
    );
    process.exit(1);
  }
  console.log("ElevenLabs voice audit — key loaded from environment (never printed).\n");

  if (args.verify) {
    const r = await getVoice(key, args.verify);
    if (!r.ok) {
      console.log(`VERIFY ${args.verify} -> HTTP ${r.status}  (NOT a usable voice id)`);
      process.exit(1);
    }
    const v = r.voice;
    const labels = v.labels ?? {};
    console.log(`VERIFY ${args.verify} -> OK`);
    console.log(`  name        ${v.name}`);
    console.log(`  category    ${v.category}`);
    console.log(`  accent      ${labels.accent ?? "-"}`);
    console.log(`  gender      ${labels.gender ?? "-"}`);
    console.log(`  age         ${labels.age ?? "-"}`);
    console.log(`  descriptive ${labels.descriptive ?? labels.description ?? "-"}`);
    console.log(`  use_case    ${labels.use_case ?? "-"}`);
    console.log(`  language    ${labels.language ?? v.fine_tuning?.language ?? "-"}`);
    const vl = Array.isArray(v.verified_languages) ? v.verified_languages : [];
    console.log(
      `  verified    ${vl.length ? vl.map((x) => `${x.language}/${x.accent ?? "-"}`).join(", ") : "none"}`
    );
    return;
  }

  if (args.premade) {
    const r = await getOwnVoices(key);
    if (!r.ok) {
      console.error(`GET /v1/voices failed: HTTP ${r.status}`);
      process.exit(1);
    }
    console.log(`Own + premade voices (${r.voices.length}):\n`);
    for (const v of r.voices) {
      const l = v.labels ?? {};
      console.log(
        `  ${(v.name ?? "").padEnd(46)} ${v.voice_id}  cat=${v.category} accent=${l.accent ?? "-"} gender=${l.gender ?? "-"} age=${l.age ?? "-"} use=${l.use_case ?? "-"}`
      );
    }
    return;
  }

  const targets = args.city
    ? CITY_TARGETS.filter(
        (t) =>
          t.city.toLowerCase() === args.city.toLowerCase() ||
          t.internalId.toLowerCase() === args.city.toLowerCase()
      )
    : CITY_TARGETS;

  if (!targets.length) {
    console.error(`Unknown city "${args.city}".`);
    console.error(`Known: ${CITY_TARGETS.map((t) => t.city).join(", ")}`);
    process.exit(1);
  }

  const reports = [];
  for (const target of targets) {
    const report = await auditCity(key, target, args.top);
    reports.push(report);
    printCity(report);
  }

  // Summary -------------------------------------------------------
  console.log("\n" + "=".repeat(74));
  console.log("SUMMARY — cities with/without a verified regional candidate");
  console.log("=".repeat(74));
  for (const r of reports) {
    const m = r.male[0];
    const f = r.female[0];
    const flag = !m && !f ? "NO CANDIDATE" : "ok";
    console.log(
      `  ${r.city.padEnd(13)} ${String(flag).padEnd(13)} male=${m ? `${m.name} (${m.accent})` : "-"} | female=${f ? `${f.name} (${f.accent})` : "-"}`
    );
  }

  if (args.json) {
    fs.writeFileSync(args.json, JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 2));
    console.log(`\nFull report written to ${args.json}`);
  }
}

main().catch((e) => {
  console.error("Audit failed:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
