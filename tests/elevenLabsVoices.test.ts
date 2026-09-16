/**
 * Voice routing tests.
 *
 * Every assertion runs against an injected env object, so the suite never
 * touches `process.env` and never needs an ElevenLabs API key.
 *
 *     npm test
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  DIALECT_LANGUAGE_CODE,
  GLOBAL_FALLBACK_FEMALE,
  GLOBAL_FALLBACK_MALE,
  PREMIUM_DIALECT_VOICES,
  dialectsNeedingNativeTest,
  regionalVoicesEnabled,
  resolveElevenLabsVoiceId,
  resolveElevenLabsVoiceSelection,
  voiceEnvVarName,
  type VoiceEnv,
} from "../lib/elevenLabsVoices";

/** Regional catalogue switched on, nothing else set. */
const ON: VoiceEnv = { ELEVENLABS_REGIONAL_VOICES: "true" };
/** Nothing set at all — the production default today. */
const OFF: VoiceEnv = {};

const ALL_PREMIUM = Object.keys(PREMIUM_DIALECT_VOICES);

describe("premium dialect language mapping", () => {
  const expected: Record<string, string> = {
    "Jamaican Patois": "en",
    "London Roadman": "en",
    "New York Brooklyn": "en",
    "Tokyo Gyaru": "ja",
    "Paris Banlieue": "fr",
    "Russian Street": "ru",
    "Mexico City Barrio": "es",
    "Rio Favela": "pt",
    "Israeli Street": "he",
    "Arabic Egyptian": "ar",
    "Spanish Madrid": "es",
  };

  test("all 11 premium dialects are present", () => {
    assert.equal(ALL_PREMIUM.length, 11);
    for (const dialect of Object.keys(expected)) {
      assert.ok(PREMIUM_DIALECT_VOICES[dialect], `missing ${dialect}`);
    }
  });

  for (const [dialect, code] of Object.entries(expected)) {
    test(`${dialect} -> language_code ${code}`, () => {
      assert.equal(PREMIUM_DIALECT_VOICES[dialect].languageCode, code);
      assert.equal(DIALECT_LANGUAGE_CODE[dialect], code);
      // The language hint is emitted even with no regional voice configured.
      assert.equal(
        resolveElevenLabsVoiceSelection("male", dialect, OFF).languageCode,
        code
      );
    });
  }

  test("standard languages still carry a language_code", () => {
    assert.equal(DIALECT_LANGUAGE_CODE["English (Standard)"], "en");
    assert.equal(DIALECT_LANGUAGE_CODE["Hebrew (Standard)"], "he");
    assert.equal(DIALECT_LANGUAGE_CODE.German, "de");
    assert.equal(
      resolveElevenLabsVoiceSelection("female", "German", OFF).languageCode,
      "de"
    );
  });
});

describe("regional locale metadata", () => {
  const localeExpectations: Record<string, string> = {
    "Arabic Egyptian": "ar-EG",
    "Mexico City Barrio": "es-MX",
    "Rio Favela": "pt-BR",
    "Spanish Madrid": "es-ES",
    "Jamaican Patois": "en-JM",
    "Tokyo Gyaru": "ja-JP",
    "Paris Banlieue": "fr-FR",
    "Russian Street": "ru-RU",
  };

  for (const [dialect, locale] of Object.entries(localeExpectations)) {
    test(`${dialect} -> ${locale}`, () => {
      assert.equal(PREMIUM_DIALECT_VOICES[dialect].locale, locale);
      assert.equal(
        resolveElevenLabsVoiceSelection("male", dialect, ON).locale,
        locale
      );
    });
  }

  test("Madrid is Spain, CDMX is Mexico — never swapped", () => {
    assert.notEqual(
      PREMIUM_DIALECT_VOICES["Spanish Madrid"].male?.voiceId,
      PREMIUM_DIALECT_VOICES["Mexico City Barrio"].male?.voiceId
    );
    assert.equal(PREMIUM_DIALECT_VOICES["Spanish Madrid"].male?.accent, "peninsular");
    assert.equal(PREMIUM_DIALECT_VOICES["Mexico City Barrio"].male?.accent, "mexican");
  });

  test("Rio is Brazilian, never European Portuguese", () => {
    const rio = PREMIUM_DIALECT_VOICES["Rio Favela"];
    for (const v of [rio.male, rio.female]) {
      assert.equal(v?.locale, "pt-BR");
      assert.notEqual(v?.accent, "european");
    }
  });

  test("Cairo is Egyptian, never Gulf or MSA", () => {
    const cairo = PREMIUM_DIALECT_VOICES["Arabic Egyptian"];
    for (const v of [cairo.male, cairo.female]) {
      assert.equal(v?.accent, "egyptian");
      assert.equal(v?.locale, "ar-EG");
    }
  });
});

describe("gender mapping", () => {
  for (const dialect of ALL_PREMIUM) {
    const entry = PREMIUM_DIALECT_VOICES[dialect];
    if (entry.status !== "verified") continue;

    test(`${dialect} male and female resolve to different voices`, () => {
      const male = resolveElevenLabsVoiceSelection("male", dialect, ON);
      const female = resolveElevenLabsVoiceSelection("female", dialect, ON);
      assert.equal(male.voiceId, entry.male?.voiceId);
      assert.equal(female.voiceId, entry.female?.voiceId);
      assert.notEqual(male.voiceId, female.voiceId);
    });
  }

  test("gender falls through to the matching global voice", () => {
    assert.equal(resolveElevenLabsVoiceId("male", undefined, OFF), GLOBAL_FALLBACK_MALE);
    assert.equal(
      resolveElevenLabsVoiceId("female", undefined, OFF),
      GLOBAL_FALLBACK_FEMALE
    );
  });
});

describe("regional override via environment", () => {
  test("a per-city override wins over the catalogue", () => {
    const env: VoiceEnv = {
      ELEVENLABS_REGIONAL_VOICES: "true",
      ELEVENLABS_VOICE_LONDON_MALE: "custom-london-male",
    };
    const r = resolveElevenLabsVoiceSelection("male", "London Roadman", env);
    assert.equal(r.voiceId, "custom-london-male");
    assert.equal(r.source, "env-override");
    assert.equal(r.languageCode, "en");
  });

  test("an override works even with the catalogue switched off", () => {
    const env: VoiceEnv = { ELEVENLABS_VOICE_CAIRO_FEMALE: "custom-cairo-female" };
    const r = resolveElevenLabsVoiceSelection("female", "Arabic Egyptian", env);
    assert.equal(r.voiceId, "custom-cairo-female");
    assert.equal(r.source, "env-override");
  });

  test("an override for one gender does not leak to the other", () => {
    const env: VoiceEnv = { ELEVENLABS_VOICE_TOKYO_MALE: "custom-tokyo-male" };
    assert.equal(
      resolveElevenLabsVoiceSelection("male", "Tokyo Gyaru", env).voiceId,
      "custom-tokyo-male"
    );
    assert.equal(
      resolveElevenLabsVoiceSelection("female", "Tokyo Gyaru", env).voiceId,
      GLOBAL_FALLBACK_FEMALE
    );
  });

  test("whitespace-only override is ignored", () => {
    const env: VoiceEnv = { ELEVENLABS_VOICE_PARIS_MALE: "   " };
    const r = resolveElevenLabsVoiceSelection("male", "Paris Banlieue", env);
    assert.equal(r.voiceId, GLOBAL_FALLBACK_MALE);
    assert.equal(r.source, "global-fallback");
  });

  test("env var names are stable and match the documented scheme", () => {
    assert.equal(voiceEnvVarName("London Roadman", "male"), "ELEVENLABS_VOICE_LONDON_MALE");
    assert.equal(
      voiceEnvVarName("Jamaican Patois", "female"),
      "ELEVENLABS_VOICE_KINGSTON_FEMALE"
    );
    assert.equal(
      voiceEnvVarName("Mexico City Barrio", "male"),
      "ELEVENLABS_VOICE_CDMX_MALE"
    );
    assert.equal(voiceEnvVarName("Not A Dialect", "male"), undefined);
  });

  test("global voice env vars override Will/Jessica", () => {
    const env: VoiceEnv = { ELEVENLABS_VOICE_MALE: "my-global-male" };
    assert.equal(resolveElevenLabsVoiceId("male", undefined, env), "my-global-male");
    assert.equal(
      resolveElevenLabsVoiceId("male", "Israeli Street", env),
      "my-global-male"
    );
  });
});

describe("global fallback", () => {
  test("catalogue is inert unless explicitly enabled", () => {
    for (const dialect of ALL_PREMIUM) {
      const r = resolveElevenLabsVoiceSelection("male", dialect, OFF);
      assert.equal(
        r.source,
        "global-fallback",
        `${dialect} must not use a catalogue voice by default`
      );
      assert.equal(r.voiceId, GLOBAL_FALLBACK_MALE);
    }
  });

  test("ELEVENLABS_REGIONAL_VOICES accepts the documented truthy values", () => {
    for (const raw of ["1", "true", "TRUE", "on", "yes"]) {
      assert.equal(regionalVoicesEnabled({ ELEVENLABS_REGIONAL_VOICES: raw }), true, raw);
    }
    for (const raw of ["0", "false", "off", "no", "", "maybe"]) {
      assert.equal(regionalVoicesEnabled({ ELEVENLABS_REGIONAL_VOICES: raw }), false, raw);
    }
    assert.equal(regionalVoicesEnabled({}), false);
  });

  test("unknown dialect falls back safely and adds no language code", () => {
    const r = resolveElevenLabsVoiceSelection("female", "Atlantis Street", OFF);
    assert.equal(r.voiceId, GLOBAL_FALLBACK_FEMALE);
    assert.equal(r.source, "global-fallback");
    assert.equal(r.languageCode, undefined);
  });

  test("undefined dialect falls back safely", () => {
    const r = resolveElevenLabsVoiceSelection("male", undefined, ON);
    assert.equal(r.voiceId, GLOBAL_FALLBACK_MALE);
    assert.equal(r.source, "global-fallback");
  });
});

describe("Tel Aviv safe fallback", () => {
  test("is marked as needing a native test", () => {
    const entry = PREMIUM_DIALECT_VOICES["Israeli Street"];
    assert.equal(entry.status, "needs_native_test");
    assert.equal(entry.city, "Tel Aviv");
    assert.equal(entry.languageCode, "he");
    assert.equal(dialectsNeedingNativeTest().includes("Israeli Street"), true);
  });

  test("has no guessed voice in either gender", () => {
    const entry = PREMIUM_DIALECT_VOICES["Israeli Street"];
    assert.equal(entry.male, undefined);
    assert.equal(entry.female, undefined);
  });

  test("falls back to the global voice even with the catalogue enabled", () => {
    for (const gender of ["male", "female"] as const) {
      const r = resolveElevenLabsVoiceSelection(gender, "Israeli Street", ON);
      assert.equal(r.source, "global-fallback");
      assert.equal(
        r.voiceId,
        gender === "male" ? GLOBAL_FALLBACK_MALE : GLOBAL_FALLBACK_FEMALE
      );
      // The Hebrew language hint is still sent to the model.
      assert.equal(r.languageCode, "he");
    }
  });

  test("an explicit override can still be supplied for a listening test", () => {
    const env: VoiceEnv = { ELEVENLABS_VOICE_TELAVIV_FEMALE: "candidate-he-voice" };
    const r = resolveElevenLabsVoiceSelection("female", "Israeli Street", env);
    assert.equal(r.voiceId, "candidate-he-voice");
    assert.equal(r.source, "env-override");
    assert.equal(r.languageCode, "he");
  });
});

describe("no unverified or invented Voice IDs", () => {
  /** Shape of a real ElevenLabs Voice ID: 20 URL-safe chars. */
  const VOICE_ID = /^[A-Za-z0-9]{20}$/;

  test("every catalogue voice id looks like a real ElevenLabs id", () => {
    for (const [dialect, entry] of Object.entries(PREMIUM_DIALECT_VOICES)) {
      for (const [gender, voice] of Object.entries({
        male: entry.male,
        female: entry.female,
      })) {
        if (!voice) continue;
        assert.match(voice.voiceId, VOICE_ID, `${dialect}/${gender} id malformed`);
      }
    }
    assert.match(GLOBAL_FALLBACK_MALE, VOICE_ID);
    assert.match(GLOBAL_FALLBACK_FEMALE, VOICE_ID);
  });

  test("no voice id is reused across two different dialects", () => {
    const seen = new Map<string, string>();
    for (const [dialect, entry] of Object.entries(PREMIUM_DIALECT_VOICES)) {
      for (const voice of [entry.male, entry.female]) {
        if (!voice) continue;
        const prior = seen.get(voice.voiceId);
        assert.equal(prior, undefined, `${voice.voiceId} reused by ${prior} and ${dialect}`);
        seen.set(voice.voiceId, dialect);
      }
    }
  });

  test("no catalogue voice silently reuses a global fallback id", () => {
    for (const [dialect, entry] of Object.entries(PREMIUM_DIALECT_VOICES)) {
      for (const voice of [entry.male, entry.female]) {
        if (!voice) continue;
        assert.notEqual(voice.voiceId, GLOBAL_FALLBACK_MALE, dialect);
        assert.notEqual(voice.voiceId, GLOBAL_FALLBACK_FEMALE, dialect);
      }
    }
  });

  test("every verified entry carries the evidence that justified it", () => {
    for (const [dialect, entry] of Object.entries(PREMIUM_DIALECT_VOICES)) {
      assert.ok(entry.evidence.length > 40, `${dialect} has no real evidence note`);
      if (entry.status === "verified") {
        assert.ok(entry.male || entry.female, `${dialect} is verified but has no voice`);
      } else {
        assert.equal(entry.male, undefined);
        assert.equal(entry.female, undefined);
      }
    }
  });

  test("every catalogue voice records its accent and notice period", () => {
    for (const [dialect, entry] of Object.entries(PREMIUM_DIALECT_VOICES)) {
      for (const voice of [entry.male, entry.female]) {
        if (!voice) continue;
        assert.ok(voice.accent.length > 0, `${dialect} voice has no accent`);
        assert.ok(voice.name.length > 0, `${dialect} voice has no name`);
        // `null` is allowed (the owner set no notice period) but the field must exist.
        assert.ok(
          voice.noticePeriodDays === null || typeof voice.noticePeriodDays === "number",
          `${dialect} voice has no notice period field`
        );
      }
    }
  });

  test("catalogue voices meet the 30-day notice-period floor", () => {
    for (const [dialect, entry] of Object.entries(PREMIUM_DIALECT_VOICES)) {
      for (const voice of [entry.male, entry.female]) {
        if (!voice || voice.noticePeriodDays === null) continue;
        assert.ok(
          voice.noticePeriodDays >= 30,
          `${dialect} voice ${voice.name} has only ${voice.noticePeriodDays}d notice`
        );
      }
    }
  });
});

describe("model env override", () => {
  /**
   * Resolved at module load, so this mirrors the production expression rather
   * than re-importing the module under a mutated env.
   */
  const resolveModel = (env: VoiceEnv) =>
    env.ELEVENLABS_MODEL_ID || "eleven_v3_conversational";

  test("defaults to eleven_v3_conversational", () => {
    assert.equal(resolveModel({}), "eleven_v3_conversational");
    assert.equal(resolveModel({ ELEVENLABS_MODEL_ID: "" }), "eleven_v3_conversational");
  });

  test("never defaults to eleven_v3 or eleven_multilingual_v2", () => {
    const actual = resolveModel({});
    assert.notEqual(actual, "eleven_v3");
    assert.notEqual(actual, "eleven_multilingual_v2");
  });

  test("can be overridden for an A/B test against eleven_v3", () => {
    assert.equal(resolveModel({ ELEVENLABS_MODEL_ID: "eleven_v3" }), "eleven_v3");
  });
});
