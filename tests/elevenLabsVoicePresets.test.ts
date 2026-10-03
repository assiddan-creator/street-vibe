/**
 * Kingston Male preset — resolution, isolation from vibe, and unaffected
 * global behaviour for every other dialect/gender.
 *
 *     npm test
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { getVoicePreset, ELEVENLABS_VOICE_PRESETS, modelForDialect } from "../lib/elevenLabsVoicePresets";
import { resolveElevenLabsVoiceSelection, resolveElevenLabsVoiceId } from "../lib/elevenLabsTts";

const KINGSTON = "Jamaican Patois";
const V4_TURBO = "eleven_v4_turbo";
const V3C = "eleven_v3_conversational";

describe("Kingston Male preset resolution", () => {
  test("Jamaican Patois + male resolves to the assi rasta preset", () => {
    const preset = getVoicePreset(KINGSTON, "male");
    assert.ok(preset, "expected a preset for Jamaican Patois + male");
    assert.equal(preset!.id, "kingston-male-assi-rasta");
    assert.equal(preset!.name, "Street Vibe / Kingston / Male / assi rasta");
    assert.equal(preset!.dialect, KINGSTON);
    assert.equal(preset!.gender, "male");
  });

  test("voice id is JNakJx0PcoBLBnZ9Rvm2", () => {
    assert.equal(getVoicePreset(KINGSTON, "male")?.voiceId, "JNakJx0PcoBLBnZ9Rvm2");
  });

  test("model is eleven_v3_conversational (v4_turbo was tried and reverted)", () => {
    // v2 -> v3 conversational (manual listening test) -> v4 turbo (blind A/B,
    // picked by ear for Kingston). Voice and settings are unchanged.
    const preset = getVoicePreset(KINGSTON, "male")!;
    assert.equal(preset.modelId, V3C);
    assert.notEqual(preset.modelId, "eleven_multilingual_v2");
  });

  test("voice settings match the approved values exactly", () => {
    const s = getVoicePreset(KINGSTON, "male")!.settings;
    assert.equal(s.stability, 0.5);
    assert.equal(s.similarity_boost, 0.75);
    assert.equal(s.style, 0);
    assert.equal(s.speed, 0.8);
    assert.equal(s.use_speaker_boost, true);
  });

  test("recommended seed is stored as 12345", () => {
    assert.equal(getVoicePreset(KINGSTON, "male")?.recommendedSeed, 12345);
  });
});

describe("preset is final — vibe never overwrites it", () => {
  const VIBES = [undefined, "dm", "flirt", "angry", "stoned", "hype", "post"];

  for (const vibe of VIBES) {
    test(`vibe=${vibe ?? "(none)"} leaves the Kingston Male preset settings untouched`, () => {
      const r = resolveElevenLabsVoiceSelection("male", KINGSTON, vibe);
      assert.equal(r.presetId, "kingston-male-assi-rasta");
      assert.equal(r.voiceId, "JNakJx0PcoBLBnZ9Rvm2");
      assert.equal(r.modelId, V3C);
      assert.deepEqual(r.settings, {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0,
        speed: 0.8,
        use_speaker_boost: true,
      });
      assert.equal(r.seed, 12345);
    });
  }

  test("preset's applyVibe flag is false", () => {
    assert.equal(getVoicePreset(KINGSTON, "male")?.applyVibe, false);
  });
});

describe("fallback (no preset) keeps Will/Jessica", () => {
  test("Jamaican Patois + female has no preset (stays Jessica, v3 conversational, vibe settings)", () => {
    assert.equal(getVoicePreset(KINGSTON, "female"), undefined);
    const r = resolveElevenLabsVoiceSelection("female", KINGSTON, "dm");
    assert.equal(r.presetId, undefined);
    assert.equal(r.voiceId, "cgSgspJ2msm6clMCkdW9"); // Jessica
    assert.equal(r.modelId, V3C);
    assert.deepEqual(r.settings, { similarity_boost: 0.8, use_speaker_boost: true, speed: 1, stability: 0.42, style: 0.28 });
  });

  test("standard languages keep Will/Jessica", () => {
    for (const dialect of ["English (Standard)", "Hebrew (Standard)", "German"]) {
      assert.equal(getVoicePreset(dialect, "male"), undefined, dialect);
      assert.equal(resolveElevenLabsVoiceSelection("male", dialect, "dm").voiceId, "bIHbv24MWmeRgasZH58o"); // Will
      assert.equal(resolveElevenLabsVoiceSelection("female", dialect, "dm").voiceId, "cgSgspJ2msm6clMCkdW9"); // Jessica
    }
  });

  test("undefined dialect falls back to global Will/Jessica for both genders", () => {
    const male = resolveElevenLabsVoiceSelection("male", undefined, "dm");
    const female = resolveElevenLabsVoiceSelection("female", undefined, "dm");
    assert.equal(male.presetId, undefined);
    assert.equal(male.voiceId, "bIHbv24MWmeRgasZH58o");
    assert.equal(female.presetId, undefined);
    assert.equal(female.voiceId, "cgSgspJ2msm6clMCkdW9");
  });

  test("unknown dialect falls back safely, no crash", () => {
    const r = resolveElevenLabsVoiceSelection("male", "Atlantis Street", "dm");
    assert.equal(r.presetId, undefined);
    assert.equal(r.voiceId, "bIHbv24MWmeRgasZH58o");
  });

  test("global voice-id-only helper is untouched by presets", () => {
    assert.equal(resolveElevenLabsVoiceId("male"), "bIHbv24MWmeRgasZH58o");
    assert.equal(resolveElevenLabsVoiceId("female"), "cgSgspJ2msm6clMCkdW9");
  });

  test("v4 fallback: vibe still moves stability, but only stability + similarity_boost are sent", () => {
    const dm = resolveElevenLabsVoiceSelection("male", "English (Standard)", "dm");
    const angry = resolveElevenLabsVoiceSelection("male", "English (Standard)", "angry");
    assert.equal(dm.modelId, V4_TURBO);
    assert.deepEqual(dm.settings, { stability: 0.42, similarity_boost: 0.8 });
    assert.deepEqual(angry.settings, { stability: 0.3, similarity_boost: 0.8 });
  });
});

describe('collection "asssi" voices (2026-10)', () => {
  const PICKS: [dialect: string, lang: string, male: string, female: string][] = [
    ["London Roadman", "en", "2mltbVQP21Fq8XgIfRQJ", "3cuC1hNj9E2jcHlIvndN"], // Axell / Peach
    ["New York Brooklyn", "en", "rPMkKgdwgIwqv4fXgR6N", "klHXweKCxxmBYweAPtk4"], // Tyler / Malia
    ["Paris Banlieue", "fr", "M4DbUhGmKgKUc1GsJEHY", "nVPCtAFzgyMX3FZKNzH0"], // Jonathan / Anna
    ["Spanish Madrid", "es", "U1qYNY0pKaPbq2VSGpif", "eZxqQzb5CuYo3Kl6EXfZ"], // Carlos / Sofia
    ["Mexico City Barrio", "es", "htEyPDatXgnV0Xo4jMFF", "nTkjq09AuYgsNR8E4sDe"], // Dante Iván / Cristina Campos
    ["Russian Street", "ru", "gXMhWmiqsFkrcssqVb5k", "t6lBrEl93uCiLR1Lgm8v"], // Valery / Alisa
    ["Tokyo Gyaru", "ja", "LIisRj2veIKEBdr6KZ5y", "dhGvgIx0X6G3xzSWqOye"], // Hadou / Kana
    ["Rio Favela", "pt", "r3KkFedJ4n8aabIZ0RFQ", "x8FWrDHAK5xiFTJLpnHq"], // Will (pt-BR) / Carla
    ["Israeli Street", "he", "JIxTgeeS5w0UQyBxEnrl", "UZzDIQRRTW2Id7YBcbgC"], // Itai / Maya
    ["Arabic Egyptian", "ar", "QvNF0qyyt1Tuy1YAmnzH", "xPcC3nehhziQaOrIeAwv"], // Mostafa / Ghozlan
  ];

  test("presets exist for Kingston (male) plus a male + female for the 10 other cities", () => {
    assert.deepEqual(Object.keys(ELEVENLABS_VOICE_PRESETS).sort(), [KINGSTON, ...PICKS.map((p) => p[0])].sort());
  });

  test("not used: Nicolas Petit, Bon, Samara X", () => {
    const ids = Object.values(ELEVENLABS_VOICE_PRESETS).flatMap((g) => Object.values(g).map((p) => p!.voiceId));
    for (const unused of ["WUAdt1wuIPYQ1XruI5dW", "v4ReB1krtgqJDjMYLtCr", "19STyYD15bswVz51nqLf"]) {
      assert.ok(!ids.includes(unused), unused);
    }
    assert.equal(new Set(ids).size, ids.length, "every voice is used once");
  });

  for (const [dialect, lang, male, female] of PICKS) {
    for (const [gender, voiceId] of [["male", male], ["female", female]] as const) {
      test(`${dialect} ${gender}: collection voice, language_code ${lang}`, () => {
        const r = resolveElevenLabsVoiceSelection(gender, dialect, "angry");
        assert.equal(r.voiceId, voiceId);
        assert.equal(r.languageCode, lang);
        assert.ok(r.presetId);
        assert.equal(r.seed, undefined);
        if (dialect === "New York Brooklyn") {
          // v3 conversational: Brooklyn keeps its vibe-driven settings exactly as before.
          assert.equal(r.modelId, V3C);
          assert.deepEqual(r.settings, { similarity_boost: 0.8, use_speaker_boost: true, speed: 1, stability: 0.3, style: 0.45 });
        } else {
          // v4: fixed start settings, only the two supported fields, vibe ignored.
          assert.equal(r.modelId, V4_TURBO);
          assert.deepEqual(r.settings, { stability: 0.5, similarity_boost: 0.75 });
        }
      });
    }
  }
});

describe("per-city model: eleven_v4_turbo everywhere, Brooklyn and Kingston eleven_v3_conversational", () => {
  const ALL_CITIES = [
    KINGSTON,
    "London Roadman",
    "New York Brooklyn",
    "Tokyo Gyaru",
    "Paris Banlieue",
    "Russian Street",
    "Mexico City Barrio",
    "Rio Favela",
    "Israeli Street",
    "Arabic Egyptian",
    "Spanish Madrid",
  ];

  test("every city and gender gets its model; only Brooklyn and Kingston stay on v3 conversational", () => {
    for (const dialect of ALL_CITIES) {
      const want = dialect === "New York Brooklyn" || dialect === KINGSTON ? V3C : V4_TURBO;
      assert.equal(modelForDialect(dialect), want, dialect);
      for (const gender of ["male", "female"] as const) {
        assert.equal(resolveElevenLabsVoiceSelection(gender, dialect, "dm").modelId, want, `${dialect} ${gender}`);
      }
    }
  });

  test("standard languages and unknown/undefined dialects default to eleven_v4_turbo", () => {
    for (const d of ["English (Standard)", "Hebrew (Standard)", "Atlantis Street", undefined]) {
      assert.equal(resolveElevenLabsVoiceSelection("male", d, "dm").modelId, V4_TURBO, String(d));
    }
  });

  test("v4 requests never carry style, speed or use_speaker_boost", () => {
    for (const dialect of ALL_CITIES) {
      for (const gender of ["male", "female"] as const) {
        const r = resolveElevenLabsVoiceSelection(gender, dialect, "hype");
        if (r.modelId !== V4_TURBO) continue;
        assert.deepEqual(Object.keys(r.settings).sort(), ["similarity_boost", "stability"], `${dialect} ${gender}`);
      }
    }
  });
});

describe("ELEVENLABS_MODEL_OVERRIDE kill switch", () => {
  const withOverride = (value: string | undefined, fn: () => void) => {
    const prev = process.env.ELEVENLABS_MODEL_OVERRIDE;
    if (value === undefined) delete process.env.ELEVENLABS_MODEL_OVERRIDE;
    else process.env.ELEVENLABS_MODEL_OVERRIDE = value;
    try {
      fn();
    } finally {
      if (prev === undefined) delete process.env.ELEVENLABS_MODEL_OVERRIDE;
      else process.env.ELEVENLABS_MODEL_OVERRIDE = prev;
    }
  };

  test("when set, forces one model for every city and gender, presets included", () => {
    withOverride(V3C, () => {
      for (const d of [KINGSTON, "London Roadman", "New York Brooklyn", "Rio Favela", undefined]) {
        for (const g of ["male", "female"] as const) {
          assert.equal(resolveElevenLabsVoiceSelection(g, d, "dm").modelId, V3C, `${d} ${g}`);
        }
      }
    });
  });

  test("override changes only the model, never the voice, settings or seed", () => {
    const base = resolveElevenLabsVoiceSelection("male", KINGSTON, "dm");
    withOverride("eleven_multilingual_v2", () => {
      const r = resolveElevenLabsVoiceSelection("male", KINGSTON, "dm");
      assert.equal(r.modelId, "eleven_multilingual_v2");
      assert.deepEqual({ ...r, modelId: base.modelId }, base);
    });
  });

  test("unset or blank override is ignored", () => {
    withOverride(undefined, () => assert.equal(resolveElevenLabsVoiceSelection("male", "London Roadman", "dm").modelId, V4_TURBO));
    withOverride("   ", () => assert.equal(resolveElevenLabsVoiceSelection("male", "London Roadman", "dm").modelId, V4_TURBO));
  });
});

describe("Kingston revert: exactly the pre-v4 request", () => {
  test("male: assi rasta voice, v3 conversational, approved settings and seed 12345", () => {
    const r = resolveElevenLabsVoiceSelection("male", KINGSTON, "dm");
    assert.deepEqual(r, {
      voiceId: "JNakJx0PcoBLBnZ9Rvm2",
      modelId: V3C,
      settings: { stability: 0.5, similarity_boost: 0.75, style: 0, speed: 0.8, use_speaker_boost: true },
      languageCode: undefined,
      seed: 12345,
      presetId: "kingston-male-assi-rasta",
    });
  });
});
