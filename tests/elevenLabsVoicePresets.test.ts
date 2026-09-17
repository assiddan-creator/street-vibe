/**
 * Kingston Male preset — resolution, isolation from vibe, and unaffected
 * global behaviour for every other dialect/gender.
 *
 *     npm test
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { getVoicePreset, ELEVENLABS_VOICE_PRESETS } from "../lib/elevenLabsVoicePresets";
import { resolveElevenLabsVoiceSelection, resolveElevenLabsVoiceId } from "../lib/elevenLabsTts";

const KINGSTON = "Jamaican Patois";

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

  test("model is eleven_multilingual_v2 — never the global eleven_v3_conversational", () => {
    const preset = getVoicePreset(KINGSTON, "male")!;
    assert.equal(preset.modelId, "eleven_multilingual_v2");
    assert.notEqual(preset.modelId, "eleven_v3_conversational");
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
      assert.equal(r.modelId, "eleven_multilingual_v2");
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
    assert.equal(r.modelId, "eleven_v3_conversational");
  });

  test("London Roadman male/female unaffected — no preset for either", () => {
    assert.equal(getVoicePreset("London Roadman", "male"), undefined);
    assert.equal(getVoicePreset("London Roadman", "female"), undefined);
    const male = resolveElevenLabsVoiceSelection("male", "London Roadman", "dm");
    assert.equal(male.presetId, undefined);
    assert.equal(male.voiceId, "bIHbv24MWmeRgasZH58o"); // Will
    assert.equal(male.modelId, "eleven_v3_conversational");
  });

  test("every other dialect has zero presets", () => {
    const dialectsWithPresets = Object.keys(ELEVENLABS_VOICE_PRESETS);
    assert.deepEqual(dialectsWithPresets, [KINGSTON]);
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
    const dm = resolveElevenLabsVoiceSelection("male", "London Roadman", "dm");
    const angry = resolveElevenLabsVoiceSelection("male", "London Roadman", "angry");
    assert.notDeepEqual(dm.settings, angry.settings);
    assert.equal(angry.settings.stability, 0.3);
    assert.equal(angry.settings.style, 0.45);
  });
});
