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

  test("model is eleven_v4_turbo, per the 2026-10 v3c / v4_turbo / v4 blind A/B", () => {
    // v2 -> v3 conversational (manual listening test) -> v4 turbo (blind A/B,
    // picked by ear for Kingston). Voice and settings are unchanged.
    const preset = getVoicePreset(KINGSTON, "male")!;
    assert.equal(preset.modelId, V4_TURBO);
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
      assert.equal(r.modelId, V4_TURBO);
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

describe("everything else keeps exact existing production behaviour", () => {
  test("Jamaican Patois + female has no preset (stays Jessica)", () => {
    assert.equal(getVoicePreset(KINGSTON, "female"), undefined);
    const r = resolveElevenLabsVoiceSelection("female", KINGSTON, "dm");
    assert.equal(r.presetId, undefined);
    assert.equal(r.voiceId, "cgSgspJ2msm6clMCkdW9"); // Jessica
    assert.equal(r.modelId, V4_TURBO);
  });

  test("cities without an approved voice keep Will/Jessica", () => {
    for (const dialect of ["Rio Favela", "Arabic Egyptian", "Israeli Street", "English (Standard)"]) {
      assert.equal(getVoicePreset(dialect, "male"), undefined, dialect);
      const male = resolveElevenLabsVoiceSelection("male", dialect, "dm");
      assert.equal(male.presetId, undefined);
      assert.equal(male.voiceId, "bIHbv24MWmeRgasZH58o"); // Will
      assert.equal(male.modelId, V4_TURBO);
    }
  });

  test("only the approved dialects have presets", () => {
    assert.deepEqual(Object.keys(ELEVENLABS_VOICE_PRESETS).sort(), [
      KINGSTON,
      "London Roadman",
      "Mexico City Barrio",
      "New York Brooklyn",
      "Paris Banlieue",
      "Russian Street",
      "Spanish Madrid",
      "Tokyo Gyaru",
    ].sort());
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

  test("vibe still changes settings for the non-preset (global) path", () => {
    const dm = resolveElevenLabsVoiceSelection("male", "Rio Favela", "dm");
    const angry = resolveElevenLabsVoiceSelection("male", "Rio Favela", "angry");
    assert.notDeepEqual(dm.settings, angry.settings);
    assert.equal(angry.settings.stability, 0.3);
    assert.equal(angry.settings.style, 0.45);
  });
});

describe("city library voices (2026-09-24 audition)", () => {
  const PICKS: [string, string, string][] = [
    ["London Roadman", "vr54y8Xovf4AEnfNrGqH", "en"],
    ["New York Brooklyn", "9pKX7TwfPxl7p2PNZQ1B", "en"],
    ["Paris Banlieue", "mvhJVdVoTWVUtL4keT7W", "fr"],
    ["Spanish Madrid", "jadd0g0NRgNgE8nt4ofn", "es"],
    ["Mexico City Barrio", "pC0w7bOSDTlgiOCrNBX3", "es"],
    ["Russian Street", "lsAmGFzUYusakA482527", "ru"],
    ["Tokyo Gyaru", "Mv8AjrYZCBkdsmDHNwcB", "ja"],
  ];

  for (const [dialect, voiceId, lang] of PICKS) {
    test(`${dialect} male uses the picked voice with language ${lang}`, () => {
      const r = resolveElevenLabsVoiceSelection("male", dialect, "dm");
      assert.equal(r.voiceId, voiceId);
      assert.equal(r.languageCode, lang);
      assert.equal(r.modelId, dialect === "New York Brooklyn" ? V3C : V4_TURBO);
      assert.ok(r.presetId);
      assert.equal(r.seed, undefined);
    });

    test(`${dialect} female still uses Jessica`, () => {
      assert.equal(resolveElevenLabsVoiceSelection("female", dialect, "dm").voiceId, "cgSgspJ2msm6clMCkdW9");
    });
  }

  test("library voices keep vibe-driven delivery", () => {
    const dm = resolveElevenLabsVoiceSelection("male", "London Roadman", "dm");
    const angry = resolveElevenLabsVoiceSelection("male", "London Roadman", "angry");
    assert.equal(dm.settings.stability, 0.42);
    assert.equal(angry.settings.stability, 0.3);
  });
});

describe("per-city model (2026-10 A/B): eleven_v4_turbo everywhere, Brooklyn eleven_v3_conversational", () => {
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

  test("every city and gender gets its model; only Brooklyn stays on v3 conversational", () => {
    for (const dialect of ALL_CITIES) {
      const want = dialect === "New York Brooklyn" ? V3C : V4_TURBO;
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

  test("only the model changed: voices and settings are the same as before", () => {
    assert.equal(resolveElevenLabsVoiceSelection("male", "New York Brooklyn", "dm").voiceId, "9pKX7TwfPxl7p2PNZQ1B");
    assert.equal(resolveElevenLabsVoiceSelection("male", "Rio Favela", "dm").voiceId, "bIHbv24MWmeRgasZH58o");
    assert.deepEqual(resolveElevenLabsVoiceSelection("male", "London Roadman", "dm").settings, {
      similarity_boost: 0.8,
      use_speaker_boost: true,
      speed: 1,
      stability: 0.42,
      style: 0.28,
    });
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
    withOverride(undefined, () => assert.equal(resolveElevenLabsVoiceSelection("male", KINGSTON, "dm").modelId, V4_TURBO));
    withOverride("   ", () => assert.equal(resolveElevenLabsVoiceSelection("male", KINGSTON, "dm").modelId, V4_TURBO));
  });
});
