import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { fetchTtsAudioUrl } from "../lib/ttsClient";
import { readStoredAnalyticsEvents } from "../lib/analyticsEvents";
import { TtsRequestError, canOfferBasicVoice, ttsFailureMessage } from "../lib/ttsErrors";

const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
const utteranceDescriptor = Object.getOwnPropertyDescriptor(globalThis, "SpeechSynthesisUtterance");
let nativePlays = 0;

beforeEach(() => {
  nativePlays = 0;
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
    speechSynthesis: {
      cancel() {},
      speak(u: { onend: () => void }) { nativePlays++; queueMicrotask(() => u.onend()); },
    },
  } });
  Object.defineProperty(globalThis, "SpeechSynthesisUtterance", { configurable: true, value: class {
    lang = "";
    constructor(public text: string) {}
  } });
});
afterEach(() => {
  if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor);
  else Reflect.deleteProperty(globalThis, "window");
  if (utteranceDescriptor) Object.defineProperty(globalThis, "SpeechSynthesisUtterance", utteranceDescriptor);
  else Reflect.deleteProperty(globalThis, "SpeechSynthesisUtterance");
});

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

for (const limitReached of [true, false]) {
  test(`429 is surfaced without speech (quota=${limitReached})`, async (t) => {
    t.mock.method(globalThis, "fetch", async () => response({ error: "Today's voice limit reached", limitReached }, 429));
    await assert.rejects(fetchTtsAudioUrl("Hello", "London Roadman"), (error: unknown) => {
      assert.ok(error instanceof TtsRequestError);
      assert.equal(error.httpStatus, 429);
      assert.equal(canOfferBasicVoice(error), false);
      assert.match(ttsFailureMessage(error), limitReached ? /Today's voice limit/ : /wait a little/);
      return true;
    });
    assert.equal(nativePlays, 0);
    assert.equal(readStoredAnalyticsEvents().at(-1)?.name, "tts_failed");
  });
}

test("provider failure offers a choice but never speaks automatically", async (t) => {
  t.mock.method(globalThis, "fetch", async () => response({ error: "Unavailable", engine: "elevenlabs" }, 502));
  await assert.rejects(fetchTtsAudioUrl("Hello", "London Roadman"), (error: unknown) => {
    assert.equal(canOfferBasicVoice(error), true);
    return true;
  });
  assert.equal(nativePlays, 0);
  const last = readStoredAnalyticsEvents().at(-1);
  assert.ok(last?.name === "tts_failed");
  assert.equal(last.effectiveEngine, "elevenlabs");
});

test("network failure never starts browser speech", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new TypeError("Failed to fetch"); });
  await assert.rejects(fetchTtsAudioUrl("Hello", "London Roadman"));
  assert.equal(nativePlays, 0);
});

test("successful audio records the server's actual provider", async (t) => {
  t.mock.method(globalThis, "fetch", async () => response({ audioBase64: "test", engine: "elevenlabs" }));
  assert.equal(await fetchTtsAudioUrl("Hello", "London Roadman"), "data:audio/mp3;base64,test");
  const last = readStoredAnalyticsEvents().at(-1);
  assert.ok(last?.name === "tts_succeeded");
  assert.equal(last.effectiveEngine, "elevenlabs");
  assert.equal(nativePlays, 0);
});

test("explicit basic voice speaks without a paid request", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("No network expected"); });
  assert.equal(await fetchTtsAudioUrl("Hello", "London Roadman", "native", "dm", undefined, { explicitBasicVoice: true }), null);
  assert.equal(fetch.mock.callCount(), 0);
  assert.equal(nativePlays, 1);
  const last = readStoredAnalyticsEvents().at(-1);
  assert.ok(last?.name === "tts_succeeded");
  assert.equal(last.effectiveEngine, "native");
  assert.equal(last.usedFallbackNative, true);
});

for (const canceled of [false, true]) {
  test(`poll failure stops immediately without native fallback (canceled=${canceled})`, async (t) => {
    let calls = 0;
    t.mock.method(globalThis, "fetch", async () => {
      calls++;
      return calls === 1 ? response({ predictionId: "test", engine: "minimax" })
        : canceled ? response({ status: "canceled" }) : response({ error: "Too many requests" }, 429);
    });
    await assert.rejects(fetchTtsAudioUrl("Hello", "London Roadman"));
    assert.equal(calls, 2);
    assert.equal(nativePlays, 0);
  });
}
