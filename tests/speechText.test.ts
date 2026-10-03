/**
 * speechText: a speech-only version of the translated line with pronunciation hints
 * (Hebrew niqqud / Egyptian tashkeel by addressee gender, Japanese kana readings,
 * Russian ё). The display line never changes; TTS uses speechText only when it is
 * provably the same line.
 *
 *     npm test
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";

import {
  isSameSpokenLine,
  isValidSpeechText,
  speechTextOrDisplay,
  speechTextPromptBlock,
  splitSpeechText,
} from "../lib/speechText";
import { prepareSpeechText } from "../lib/prepareSpeechText";
import { addSpeechPunctuation } from "../lib/speechPunctuation";
import { POST } from "../app/api/tts/route";

const HE = "Israeli Street";
const AR = "Arabic Egyptian";
const JA = "Tokyo Gyaru";
const RU = "Russian Street";

const HE_DISPLAY_F = "ראיתי אותך בטיקטוק, שרה, וממש עפתי על הוואיב שלך";
const HE_SPEECH_F = "ראיתי אוֹתָךְ בטיקטוק, שרה, וממש עפתי על הוואיב שֶׁלָּךְ";
const HE_DISPLAY_M = "ראיתי אותך בטיקטוק, דני, וממש עפתי על הוואיב שלך";
const HE_SPEECH_M = "ראיתי אוֹתְךָ בטיקטוק, דני, וממש עפתי על הוואיב שֶׁלְּךָ";
const AR_DISPLAY_F = "شفتك على تيك توك يا سارة، وعجبتني روحك أوي";
const AR_SPEECH_F = "شُفْتِك على تيك توك يا سارة، وعجبتني روحِك أوي";
const AR_DISPLAY_M = "شفتك على تيك توك يا داني، وعجبتني روحك أوي";
const AR_SPEECH_M = "شُفْتَك على تيك توك يا داني، وعجبتني روحَك أوي";

describe("parsing the model output", () => {
  test("splits message ||| dictionary @@@ ADDRESSEE + speech line", () => {
    const raw = `${HE_DISPLAY_F}\n|||\nעפתי - loved\n@@@\nADDRESSEE: female\n${HE_SPEECH_F}`;
    const r = splitSpeechText(raw);
    assert.equal(r.body, `${HE_DISPLAY_F}\n|||\nעפתי - loved`);
    assert.equal(r.addressee, "female");
    assert.equal(r.speech, HE_SPEECH_F);
  });

  test("no separator -> no speech line (today's behavior)", () => {
    assert.deepEqual(splitSpeechText("שלום\n|||\n—"), { body: "שלום\n|||\n—", speech: null, addressee: null });
  });

  test("prompt block only for Tel Aviv, Cairo, Tokyo, Moscow", () => {
    for (const d of [HE, AR, JA, RU]) assert.match(speechTextPromptBlock(d), /@@@/);
    for (const d of ["London Roadman", "Rio Favela", "Hebrew (Standard)", undefined]) assert.equal(speechTextPromptBlock(d), "");
    assert.match(speechTextPromptBlock(HE), /ADDRESSEE: male/);
    assert.match(speechTextPromptBlock(AR), /ADDRESSEE: female/);
  });
});

describe("Hebrew (Tel Aviv): niqqud only by addressee gender", () => {
  test("female addressee: feminine niqqud accepted", () => {
    assert.equal(isValidSpeechText(HE_DISPLAY_F, HE_SPEECH_F, HE, "female"), true);
  });
  test("male addressee: masculine niqqud accepted", () => {
    assert.equal(isValidSpeechText(HE_DISPLAY_M, HE_SPEECH_M, HE, "male"), true);
  });
  test("unknown addressee: no marks expected; marked line rejected", () => {
    assert.equal(isValidSpeechText(HE_DISPLAY_M, HE_SPEECH_M, HE, "unknown"), false);
    assert.equal(isValidSpeechText(HE_DISPLAY_M, HE_DISPLAY_M, HE, "unknown"), true);
  });
  test("marks contradicting the declared gender are rejected (Dani read as feminine)", () => {
    const wrong = "ראיתי אוֹתָךְ בטיקטוק, דני, וממש עפתי על הוואיב שֶׁלָּךְ";
    assert.equal(isValidSpeechText(HE_DISPLAY_M, wrong, HE, "male"), false);
    assert.equal(isValidSpeechText(HE_DISPLAY_F, HE_SPEECH_M.replace("דני", "שרה"), HE, "female"), false);
  });
  test("missing ADDRESSEE line -> rejected", () => {
    assert.equal(isValidSpeechText(HE_DISPLAY_F, HE_SPEECH_F, HE, null), false);
  });
  test("any changed letter or word -> rejected", () => {
    assert.equal(isSameSpokenLine(HE_DISPLAY_F, HE_SPEECH_F.replace("עפתי", "אהבתי"), HE), false);
    assert.equal(isSameSpokenLine(HE_DISPLAY_F, HE_SPEECH_F + " מאוד", HE), false);
  });
});

describe("Egyptian Arabic (Cairo): tashkeel only by addressee gender", () => {
  test("female addressee: kasra on every ـك form accepted", () => {
    assert.equal(isValidSpeechText(AR_DISPLAY_F, AR_SPEECH_F, AR, "female"), true);
  });
  test("male addressee: fatḥa accepted", () => {
    assert.equal(isValidSpeechText(AR_DISPLAY_M, AR_SPEECH_M, AR, "male"), true);
  });
  test("unknown addressee: marked line rejected, plain line accepted", () => {
    assert.equal(isValidSpeechText(AR_DISPLAY_M, AR_SPEECH_M, AR, "unknown"), false);
    assert.equal(isValidSpeechText(AR_DISPLAY_M, AR_DISPLAY_M, AR, "unknown"), true);
  });
  test("contradicting marks rejected; an added letter rejected", () => {
    assert.equal(isValidSpeechText(AR_DISPLAY_M, AR_SPEECH_F.replace("سارة", "داني"), AR, "male"), false);
    assert.equal(isSameSpokenLine(AR_DISPLAY_F, AR_SPEECH_F.replace("روحِك", "روحِكي"), AR), false);
  });
});

describe("Japanese (Tokyo) and Russian (Moscow)", () => {
  test("ambiguous kanji written in kana: accepted", () => {
    assert.equal(isValidSpeechText("今日なにしてんの？明日あそぼーよ", "きょうなにしてんの？あしたあそぼーよ", JA), true);
    assert.equal(isValidSpeechText("めっちゃ上手じゃん。", "めっちゃじょうずじゃん。", JA), true);
  });
  test("Japanese: new kanji, Latin letters or dropped kana -> rejected", () => {
    assert.equal(isValidSpeechText("今日いく？", "今日行く？", JA), false); // new kanji 行
    assert.equal(isValidSpeechText("今日いく？", "kyou いく？", JA), false);
    assert.equal(isValidSpeechText("今日いくよ？", "きょういく？", JA), false); // よ dropped
  });
  test("Russian: only е -> ё differences accepted", () => {
    assert.equal(isValidSpeechText("все норм? еще идешь?", "всё норм? ещё идёшь?", RU), true);
    assert.equal(isValidSpeechText("все норм?", "всё нормально?", RU), false);
  });
});

describe("TTS side", () => {
  test("speechTextOrDisplay: valid speech line wins, anything else falls back to the display line", () => {
    assert.equal(speechTextOrDisplay(HE_DISPLAY_F, HE_SPEECH_F, HE), HE_SPEECH_F);
    assert.equal(speechTextOrDisplay(HE_DISPLAY_F, "something else entirely", HE), HE_DISPLAY_F);
    assert.equal(speechTextOrDisplay(HE_DISPLAY_F, undefined, HE), HE_DISPLAY_F);
    assert.equal(speechTextOrDisplay("hi bruv", "hi bruv!!", "London Roadman"), "hi bruv");
  });

  test("prepareSpeechText + speech punctuation keep niqqud and tashkeel", () => {
    assert.equal(prepareSpeechText(HE_SPEECH_F, HE), HE_SPEECH_F);
    assert.equal(prepareSpeechText(AR_SPEECH_M, AR), AR_SPEECH_M);
    assert.ok(addSpeechPunctuation(prepareSpeechText(HE_SPEECH_M, HE), HE).includes("אוֹתְךָ"));
  });

  const keys = ["ELEVENLABS_API_KEY", "REPLICATE_API_TOKEN", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "ELEVENLABS_MODEL_OVERRIDE"];
  const isolate = (t: { after: (fn: () => void) => void }) => {
    const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
    t.after(() => {
      for (const k of keys) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      }
    });
    for (const k of keys) delete process.env[k];
    process.env.ELEVENLABS_API_KEY = "unit-test";
  };
  const send = async (t: Parameters<typeof isolate>[0] & { mock: typeof import("node:test").mock }, speechText: string) => {
    const sent: string[] = [];
    t.mock.method(globalThis, "fetch", async (_u: string, init?: RequestInit) => {
      sent.push(JSON.parse(String(init?.body)).text);
      return new Response(new Uint8Array(4096), { status: 200, headers: { "Content-Type": "audio/mpeg" } });
    });
    t.mock.method(console, "info", () => {});
    const res = await POST(
      new NextRequest("https://example.test/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": `10.3.0.${Math.floor(Math.random() * 200)}` },
        body: JSON.stringify({ text: HE_DISPLAY_F, speechText, dialect: HE, engine: "minimax", ttsGender: "male" }),
      })
    );
    assert.equal(res.status, 200);
    return sent[0];
  };

  test("route: a valid speechText is what ElevenLabs reads", async (t) => {
    isolate(t);
    const spoken = await send(t as never, HE_SPEECH_F);
    assert.ok(spoken.includes("אוֹתָךְ") && spoken.includes("שֶׁלָּךְ"), spoken);
  });

  test("route: a tampered speechText is ignored (display line is read)", async (t) => {
    isolate(t);
    const spoken = await send(t as never, "משהו אחר לגמרי");
    assert.ok(spoken.includes("אותך") && !spoken.includes("משהו אחר"), spoken);
  });
});
