import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareAudioFile, canShareAudio } from "../lib/audioShare";

test("inline audio becomes an MP3 file with the original bytes and a safe filename", async () => {
  const file = await prepareAudioFile("data:audio/mp3;base64,SUQzBAAA", "Tel Aviv");
  assert.equal(file.name, "street-vibe-tel-aviv.mp3");
  assert.equal(file.type, "audio/mpeg");
  assert.deepEqual([...new Uint8Array(await file.arrayBuffer())], [73, 68, 51, 4, 0, 0]);
});

test("rejects empty audio and non-audio responses", async () => {
  await assert.rejects(prepareAudioFile("data:audio/mp3;base64,", "London"), /empty or unsupported/);
  await assert.rejects(prepareAudioFile("data:text/html,error", "London"), /empty or unsupported/);
});

test("preserves WAV format instead of mislabeling it as MP3", async () => {
  const file = await prepareAudioFile("data:audio/wav;base64,UklGRg==", "London");
  assert.equal(file.name, "street-vibe-london.wav");
  assert.equal(file.type, "audio/wav");
});

test("failed fetch is surfaced without generating more audio", async t => {
  t.mock.method(globalThis, "fetch", async () => new Response("expired", { status: 403 }));
  await assert.rejects(prepareAudioFile("https://example.com/audio", "London"), /Couldn't load/);
});

test("file sharing is tested using the actual file, with safe fallback", () => {
  const file = new File(["audio"], "voice.mp3", { type: "audio/mpeg" });
  const target = { canShare: (data: ShareData) => data.files?.[0] === file, share: async () => {} };
  assert.equal(canShareAudio(file, target), true);
  assert.equal(canShareAudio(file, { ...target, canShare: () => false }), false);
  assert.equal(canShareAudio(file, { ...target, canShare: () => { throw new Error("blocked"); } }), false);
});
