/**
 * Preview-only TTS daily limit override.
 *
 * These tests cover the pure resolution logic in `lib/usage.ts`
 * (`ttsDailyLimitOverride`, `dailyLimitFor`) — the part that runs in this
 * Node process. The actual live gate for a Supabase-configured deployment is
 * the `consume_usage` Postgres function in `supabase/schema.sql`, which has
 * no test harness here (no live database in this repo's test run); it was
 * reviewed by hand and mirrors this same "ignore anything not a valid
 * positive integer" rule. See PR #22's description for that SQL diff.
 *
 *     npm test
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  DAILY_LIMITS,
  dailyLimitFor,
  ttsDailyLimitOverride,
  usageLimitsDisabled,
  applyLimitsDisabled,
  type UsageState,
} from "../lib/usage";

describe("no env var — existing limits unchanged", () => {
  test("ttsDailyLimitOverride returns null when unset", () => {
    assert.equal(ttsDailyLimitOverride({}), null);
  });

  test("dailyLimitFor matches DAILY_LIMITS exactly for every plan/kind", () => {
    for (const plan of ["anon", "free", "pro"] as const) {
      for (const kind of ["translate", "tts"] as const) {
        assert.equal(dailyLimitFor(plan, kind), DAILY_LIMITS[plan][kind]);
      }
    }
  });

  test("anon tts is still 2, free tts is still 5", () => {
    assert.equal(dailyLimitFor("anon", "tts"), 2);
    assert.equal(dailyLimitFor("free", "tts"), 5);
  });
});

describe("override=20 applies to tts for anon/free only", () => {
  const env = { USAGE_TTS_DAILY_LIMIT_OVERRIDE: "20" };

  test("parses to 20", () => {
    assert.equal(ttsDailyLimitOverride(env), 20);
  });

  test("anon tts becomes 20", () => {
    assert.equal(dailyLimitFor("anon", "tts", env), 20);
  });

  test("free tts becomes 20", () => {
    assert.equal(dailyLimitFor("free", "tts", env), 20);
  });

  test("translate limits are unchanged even though tts is overridden", () => {
    assert.equal(dailyLimitFor("anon", "translate", env), 4);
    assert.equal(dailyLimitFor("free", "translate", env), 10);
    assert.equal(DAILY_LIMITS.anon.translate, 4);
    assert.equal(DAILY_LIMITS.free.translate, 10);
  });

  test("real process.env is untouched by passing an explicit env object", () => {
    assert.equal(process.env.USAGE_TTS_DAILY_LIMIT_OVERRIDE, undefined);
    assert.equal(dailyLimitFor("anon", "tts"), 2);
  });
});

describe("pro remains unlimited regardless of override", () => {
  const env = { USAGE_TTS_DAILY_LIMIT_OVERRIDE: "20" };

  test("pro tts ignores the override entirely", () => {
    assert.equal(dailyLimitFor("pro", "tts", env), DAILY_LIMITS.pro.tts);
    assert.ok(dailyLimitFor("pro", "tts", env) >= 1_000_000);
  });

  test("pro translate is unaffected", () => {
    assert.ok(dailyLimitFor("pro", "translate", env) >= 1_000_000);
  });
});

describe("invalid override falls back safely", () => {
  const cases: [string, string | undefined][] = [
    ["unset", undefined],
    ["empty string", ""],
    ["whitespace only", "   "],
    ["zero", "0"],
    ["negative", "-5"],
    ["decimal", "3.5"],
    ["NaN literal", "NaN"],
    ["non-numeric", "twenty"],
    ["mixed", "20abc"],
    ["leading plus", "+20"],
    ["hex-looking", "0x14"],
    ["huge / not a safe integer", "99999999999999999999"],
  ];

  for (const [label, value] of cases) {
    test(`"${label}" (${JSON.stringify(value)}) is ignored`, () => {
      const env = value === undefined ? {} : { USAGE_TTS_DAILY_LIMIT_OVERRIDE: value };
      assert.equal(ttsDailyLimitOverride(env), null);
      assert.equal(dailyLimitFor("anon", "tts", env), 2);
      assert.equal(dailyLimitFor("free", "tts", env), 5);
    });
  }

  test("a valid override alongside another invalid-looking var name is unaffected", () => {
    const env = { USAGE_TTS_DAILY_LIMIT_OVERRIDE_TYPO: "20" };
    assert.equal(ttsDailyLimitOverride(env), null);
  });
});

describe("USAGE_LIMITS_DISABLED — temporary development bypass", () => {
  const blocked: UsageState = {
    plan: "anon",
    kind: "translate",
    used: 4,
    limit: 4,
    remaining: 0,
    ok: false,
    metered: true,
  };

  test("unset — normal blocked state passes through unchanged", () => {
    assert.equal(usageLimitsDisabled({}), false);
    assert.deepEqual(applyLimitsDisabled(blocked, {}), blocked);
  });

  test("false — normal blocked state passes through unchanged", () => {
    const env = { USAGE_LIMITS_DISABLED: "false" };
    assert.equal(usageLimitsDisabled(env), false);
    assert.deepEqual(applyLimitsDisabled(blocked, env), blocked);
  });

  for (const truthy of ["true", "TRUE", "True", "1", "yes", "on"]) {
    test(`"${truthy}" enables the bypass`, () => {
      assert.equal(usageLimitsDisabled({ USAGE_LIMITS_DISABLED: truthy }), true);
    });
  }

  for (const notTruthy of ["", "  ", "0", "no", "off", "disabled", "enable"]) {
    test(`"${notTruthy}" does NOT enable the bypass`, () => {
      assert.equal(usageLimitsDisabled({ USAGE_LIMITS_DISABLED: notTruthy }), false);
    });
  }

  test("when enabled, a blocked (ok:false) state becomes allowed and unlimited", () => {
    const env = { USAGE_LIMITS_DISABLED: "true" };
    const result = applyLimitsDisabled(blocked, env);
    assert.equal(result.ok, true);
    assert.ok(result.limit >= 1_000_000);
    assert.ok(result.remaining >= 1_000_000);
    // used/plan/kind/metered are left alone — only the blocking decision changes.
    assert.equal(result.used, blocked.used);
    assert.equal(result.plan, blocked.plan);
    assert.equal(result.kind, blocked.kind);
    assert.equal(result.metered, blocked.metered);
  });

  test("when enabled, applies the same way to tts as to translate", () => {
    const env = { USAGE_LIMITS_DISABLED: "true" };
    const blockedTts: UsageState = { ...blocked, kind: "tts", limit: 2, used: 2, remaining: 0, ok: false };
    const result = applyLimitsDisabled(blockedTts, env);
    assert.equal(result.ok, true);
    assert.ok(result.limit >= 1_000_000);
  });

  test("when enabled, an already-allowed state stays allowed (idempotent)", () => {
    const env = { USAGE_LIMITS_DISABLED: "true" };
    const allowed: UsageState = { ...blocked, used: 1, remaining: 3, ok: true };
    const result = applyLimitsDisabled(allowed, env);
    assert.equal(result.ok, true);
  });

  test("real process.env is untouched by passing an explicit env object", () => {
    assert.equal(process.env.USAGE_LIMITS_DISABLED, undefined);
    assert.deepEqual(applyLimitsDisabled(blocked), blocked);
  });
});
