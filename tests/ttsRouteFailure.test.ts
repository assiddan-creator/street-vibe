import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "../app/api/tts/route";
import { POST as poll } from "../app/api/tts-poll/route";

const envKeys = ["ELEVENLABS_API_KEY", "REPLICATE_API_TOKEN", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"] as const;

test("configured ElevenLabs failure does not call the alternative paid provider", async (t) => {
  const saved = Object.fromEntries(envKeys.map(k => [k, process.env[k]]));
  t.after(() => {
    for (const key of envKeys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });
  for (const key of envKeys) delete process.env[key];
  process.env.ELEVENLABS_API_KEY = "unit-test";
  process.env.REPLICATE_API_TOKEN = "unit-test";
  const urls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string) => {
    urls.push(String(url));
    return new Response(JSON.stringify({ detail: { message: "Test provider unavailable" } }), { status: 503 });
  });
  const result = await POST(new NextRequest("https://example.test/api/tts", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Hello", dialect: "London Roadman", engine: "minimax", ttsGender: "male" }),
  }));
  assert.equal(result.status, 502);
  assert.equal((await result.json()).engine, "elevenlabs");
  assert.equal(urls.length, 1);
  assert.match(urls[0], /^https:\/\/api\.elevenlabs\.io\//);
});

test("upstream polling HTTP failure is returned as failure, not an empty 200", async (t) => {
  const saved = process.env.REPLICATE_API_TOKEN;
  process.env.REPLICATE_API_TOKEN = "unit-test";
  t.after(() => {
    if (saved === undefined) delete process.env.REPLICATE_API_TOKEN;
    else process.env.REPLICATE_API_TOKEN = saved;
  });
  t.mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ detail: "Not found" }), { status: 404 }));
  const result = await poll(new NextRequest("https://example.test/api/tts-poll", {
    method: "POST", body: JSON.stringify({ predictionId: "unit-test" }),
  }));
  assert.equal(result.status, 502);
  assert.match((await result.json()).error, /Unable to check/);
});

/** Route-level: the model sent to ElevenLabs is the per-city one (or the kill switch), and failures log it. */
function isolateEnv(t: { after: (fn: () => void) => void }, extra: Record<string, string | undefined> = {}) {
  const keys = [...envKeys, "ELEVENLABS_MODEL_OVERRIDE"] as const;
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  t.after(() => {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });
  for (const key of keys) delete process.env[key];
  process.env.ELEVENLABS_API_KEY = "unit-test";
  for (const [k, v] of Object.entries(extra)) if (v !== undefined) process.env[k] = v;
}

const ttsRequest = (dialect: string) =>
  new NextRequest("https://example.test/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Hello there my friend", dialect, engine: "minimax", ttsGender: "male" }),
  });

for (const [dialect, want] of [
  ["London Roadman", "eleven_v4_turbo"],
  ["Rio Favela", "eleven_v4_turbo"],
  ["New York Brooklyn", "eleven_v3_conversational"],
] as const) {
  test(`${dialect}: ElevenLabs request uses model ${want}`, async (t) => {
    isolateEnv(t);
    const sent: string[] = [];
    t.mock.method(globalThis, "fetch", async (_url: string, init?: RequestInit) => {
      sent.push(JSON.parse(String(init?.body)).model_id);
      return new Response(new Uint8Array(4096), { status: 200, headers: { "Content-Type": "audio/mpeg" } });
    });
    t.mock.method(console, "info", () => {});
    const res = await POST(ttsRequest(dialect));
    assert.equal(res.status, 200);
    assert.deepEqual(sent, [want]);
  });
}

test("ELEVENLABS_MODEL_OVERRIDE forces the model at the route level", async (t) => {
  isolateEnv(t, { ELEVENLABS_MODEL_OVERRIDE: "eleven_v3_conversational" });
  const sent: string[] = [];
  t.mock.method(globalThis, "fetch", async (_url: string, init?: RequestInit) => {
    sent.push(JSON.parse(String(init?.body)).model_id);
    return new Response(new Uint8Array(4096), { status: 200, headers: { "Content-Type": "audio/mpeg" } });
  });
  t.mock.method(console, "info", () => {});
  for (const d of ["London Roadman", "Jamaican Patois", "Rio Favela"]) assert.equal((await POST(ttsRequest(d))).status, 200);
  assert.deepEqual(sent, ["eleven_v3_conversational", "eleven_v3_conversational", "eleven_v3_conversational"]);
});

test("ElevenLabs quota error still fails cleanly (502, no other provider) and logs the per-city model", async (t) => {
  isolateEnv(t, { REPLICATE_API_TOKEN: "unit-test" });
  const urls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string) => {
    urls.push(String(url));
    return new Response(JSON.stringify({ detail: { status: "quota_exceeded", message: "This request exceeds your quota." } }), { status: 401 });
  });
  const warns: unknown[][] = [];
  t.mock.method(console, "warn", (...args: unknown[]) => void warns.push(args));
  const res = await POST(ttsRequest("Spanish Madrid"));
  assert.equal(res.status, 502);
  assert.equal((await res.json()).engine, "elevenlabs");
  assert.equal(urls.length, 1);
  const log = warns.find((a) => a[0] === "[tts][elevenlabs] failed")?.[1] as Record<string, unknown>;
  assert.ok(log, "expected a failure log");
  assert.equal(log.model, "eleven_v4_turbo");
  assert.equal(log.dialect, "Spanish Madrid");
  assert.match(String(log.reason), /quota/);
});
