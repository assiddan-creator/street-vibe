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
  applyUsageBypass,
  checkAndConsumeUsage,
  isOwnerEmail,
  isRequestOwner,
  ownerEmails,
  type UsageState,
} from "../lib/usage";
import { NextRequest } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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

  test("anonymous gets the same free allowance as signed-in free: 10 translations, 5 voice plays", () => {
    assert.equal(dailyLimitFor("anon", "translate"), 10);
    assert.equal(dailyLimitFor("anon", "tts"), 5);
    assert.deepEqual(DAILY_LIMITS.anon, DAILY_LIMITS.free);
    assert.equal(dailyLimitFor("free", "translate"), 10);
    assert.equal(dailyLimitFor("free", "tts"), 5);
  });

  test("landing page promises match the real limits", () => {
    const page = readFileSync(join(__dirname, "..", "app", "page.tsx"), "utf8");
    assert.ok(page.includes(`${DAILY_LIMITS.anon.translate} free rewrites a day`), "hero line");
    assert.ok(page.includes(`${DAILY_LIMITS.free.translate} rewrites + ${DAILY_LIMITS.free.tts} voice plays a day`), "Free plan card");
  });

  test("schema.sql consume_usage uses the same anon/free limits", () => {
    const sql = readFileSync(join(__dirname, "..", "supabase", "schema.sql"), "utf8").replace(/\s+/g, " ");
    assert.ok(sql.includes(`when v_plan = 'anon' and p_kind = 'translate' then ${DAILY_LIMITS.anon.translate} `), "anon translate");
    assert.ok(sql.includes(`when v_plan = 'anon' and p_kind = 'tts' then case when p_tts_limit_override > 0 then p_tts_limit_override else ${DAILY_LIMITS.anon.tts} end`), "anon tts");
    assert.ok(sql.includes(`when v_plan = 'free' and p_kind = 'translate' then ${DAILY_LIMITS.free.translate} `), "free translate");
    assert.ok(sql.includes(`when v_plan = 'free' and p_kind = 'tts' then case when p_tts_limit_override > 0 then p_tts_limit_override else ${DAILY_LIMITS.free.tts} end`), "free tts");
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
    assert.equal(dailyLimitFor("anon", "translate", env), 10);
    assert.equal(dailyLimitFor("free", "translate", env), 10);
    assert.equal(DAILY_LIMITS.anon.translate, 10);
    assert.equal(DAILY_LIMITS.free.translate, 10);
  });

  test("real process.env is untouched by passing an explicit env object", () => {
    assert.equal(process.env.USAGE_TTS_DAILY_LIMIT_OVERRIDE, undefined);
    assert.equal(dailyLimitFor("anon", "tts"), 5);
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
      assert.equal(dailyLimitFor("anon", "tts", env), 5);
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

describe("USAGE_LIMITS_DISABLED is ignored in production", () => {
  const blocked: UsageState = { plan: "free", kind: "translate", used: 10, limit: 10, remaining: 0, ok: false, metered: true };

  test('VERCEL_ENV=production + "true" -> bypass OFF, limits apply', () => {
    const env = { USAGE_LIMITS_DISABLED: "true", VERCEL_ENV: "production" };
    assert.equal(usageLimitsDisabled(env), false);
    assert.deepEqual(applyLimitsDisabled(blocked, env), blocked);
  });

  for (const vercelEnv of ["preview", "development", undefined]) {
    test(`VERCEL_ENV=${vercelEnv ?? "(unset, local)"} + "true" -> bypass still works`, () => {
      assert.equal(usageLimitsDisabled({ USAGE_LIMITS_DISABLED: "true", VERCEL_ENV: vercelEnv }), true);
    });
  }
});

describe("OWNER_EMAILS allowlist", () => {
  const env = { OWNER_EMAILS: " Owner@Example.com , second@example.com,,not-an-email " };

  test("parses comma-separated, trimmed, lowercased; drops junk", () => {
    assert.deepEqual([...ownerEmails(env)].sort(), ["owner@example.com", "second@example.com"]);
    assert.equal(ownerEmails({}).size, 0);
  });

  test("matches case-insensitively and ignores surrounding whitespace", () => {
    assert.equal(isOwnerEmail("owner@example.com", env), true);
    assert.equal(isOwnerEmail("  OWNER@EXAMPLE.COM ", env), true);
    assert.equal(isOwnerEmail("someone@example.com", env), false);
    assert.equal(isOwnerEmail(null, env), false);
    assert.equal(isOwnerEmail("owner@example.com", {}), false);
  });

  test("anonymous visitor is never an owner, and Clerk is not even asked", async () => {
    let asked = false;
    assert.equal(await isRequestOwner(null, env, async () => ((asked = true), "owner@example.com")), false);
    assert.equal(asked, false);
  });

  test("empty OWNER_EMAILS skips the Clerk lookup entirely", async () => {
    let asked = false;
    assert.equal(await isRequestOwner("user_1", {}, async () => ((asked = true), "owner@example.com")), false);
    assert.equal(asked, false);
  });

  test("signed-in user with a listed primary email is an owner; others are not", async () => {
    assert.equal(await isRequestOwner("user_1", env, async () => "Owner@Example.com"), true);
    assert.equal(await isRequestOwner("user_2", env, async () => "someone@example.com"), false);
    assert.equal(await isRequestOwner("user_3", env, async () => null), false); // no verified primary email
  });
});

describe("limits per caller: owner / free / Pro / anonymous", () => {
  const PROD = { VERCEL_ENV: "production" };
  const free: UsageState = { plan: "free", kind: "translate", used: 10, limit: 10, remaining: 0, ok: false, metered: true };
  const freeTts: UsageState = { ...free, kind: "tts", used: 5, limit: 5 };
  const anon: UsageState = { plan: "anon", kind: "translate", used: 10, limit: 10, remaining: 0, ok: false, metered: true };
  const pro: UsageState = { plan: "pro", kind: "translate", used: 500, limit: 1_000_000, remaining: 999_500, ok: true, metered: true };

  test("owner (signed-in free account) is unlimited for translate and tts, usage still counted", () => {
    for (const s of [free, freeTts]) {
      const r = applyUsageBypass(s, true, PROD);
      assert.equal(r.ok, true);
      assert.ok(r.limit >= 1_000_000 && r.remaining >= 1_000_000);
      assert.equal(r.used, s.used);
      assert.equal(r.plan, s.plan);
    }
  });

  test("free (not owner) keeps the normal free limit in production", () => {
    assert.deepEqual(applyUsageBypass(free, false, PROD), free);
    assert.deepEqual(applyUsageBypass(freeTts, false, PROD), freeTts);
  });

  test("Pro keeps Pro limits (unchanged by this feature)", () => {
    assert.deepEqual(applyUsageBypass(pro, false, PROD), pro);
    assert.equal(DAILY_LIMITS.pro.translate, 1_000_000);
  });

  test("anonymous keeps the anon limit in production, even with USAGE_LIMITS_DISABLED set", () => {
    assert.deepEqual(applyUsageBypass(anon, false, { ...PROD, USAGE_LIMITS_DISABLED: "true" }), anon);
  });

  test("end to end (no DB, fail-open path): production anon gets 10/day, not unlimited", async (t) => {
    const keys = ["VERCEL_ENV", "USAGE_LIMITS_DISABLED", "OWNER_EMAILS", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"];
    const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
    t.after(() => {
      for (const k of keys) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      }
    });
    for (const k of keys) delete process.env[k];
    process.env.VERCEL_ENV = "production";
    process.env.USAGE_LIMITS_DISABLED = "true";
    process.env.OWNER_EMAILS = "owner@example.com";
    const r = await checkAndConsumeUsage(new NextRequest("https://example.test/api/translate"), "translate");
    assert.equal(r.plan, "anon");
    assert.equal(r.limit, DAILY_LIMITS.anon.translate);

    process.env.VERCEL_ENV = "preview";
    const p = await checkAndConsumeUsage(new NextRequest("https://example.test/api/translate"), "translate");
    assert.ok(p.limit >= 1_000_000, "dev bypass still works outside production");
  });
});
