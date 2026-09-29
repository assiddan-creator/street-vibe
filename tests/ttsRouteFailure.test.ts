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
