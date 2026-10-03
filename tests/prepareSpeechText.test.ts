/**
 * Speech-text layer (lib/prepareSpeechText.ts): cleans the TTS copy only.
 *
 *     npm test
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";

import { prepareSpeechText as p } from "../lib/prepareSpeechText";
import { addSpeechPunctuation } from "../lib/speechPunctuation";
import { POST } from "../app/api/tts/route";

describe("real messy chat lines, per language", () => {
  const CASES: [dialect: string, input: string, spoken: string][] = [
    ["London Roadman", "bro!!! 😂😂 lol thats mad???", "bro! thats mad?"],
    ["London Roadman", "**wagwan** fam,\nyou coming tonight?!?! 🔥🔥", "wagwan fam,\nyou coming tonight?!"],
    ["New York Brooklyn", "yo LMAO u tryna slide?? 💀", "yo u tryna slide?"],
    ["Jamaican Patois", "Wah gwaan!!! 😂 xD mi deh yah", "Wah gwaan! mi deh yah"],
    ["Israeli Street", "אחי!!! 😂 חחחח זה מטורף???", "אחי! זה מטורף?"],
    ["Mexico City Barrio", "¡¡¡Qué onda wey!!! 😂 lol, ¿¿¿te jalas??? xd", "¡Qué onda wey! ¿te jalas?"],
    ["Spanish Madrid", "tío!!! 😂😂 qué guay???", "tío! qué guay?"],
    ["Arabic Egyptian", "يا عم!!! 😂😂 هههههه ده جامد؟؟؟", "يا عم! ده جامد؟"],
    ["Tokyo Gyaru", "まじで最高www 今日行こ〜！！！", "まじで最高 今日行こ〜！"],
    ["Tokyo Gyaru", "ねぇ今日飲まね？(笑)", "ねぇ今日飲まね？"],
    ["Russian Street", 'Го, ёлки!!! 😂 lmao <break time="1s"/> топ', "Го, ёлки! топ"],
    ["Rio Favela", "kkkkk mano, que isso??? 😂", "mano, que isso?"],
    ["Paris Banlieue", "Wesh frérot, t'es chaud ? [laughs] *trop* bien — grave...", "Wesh frérot, t'es chaud ? trop bien — grave..."],
  ];
  for (const [dialect, input, spoken] of CASES) {
    test(`${dialect}: ${JSON.stringify(input)}`, () => assert.equal(p(input, dialect), spoken));
  }
});

describe("rules", () => {
  test("collapses repeated ! / ? runs; mixed runs become ?!", () => {
    assert.equal(p("no way!!!"), "no way!");
    assert.equal(p("for real???"), "for real?");
    assert.equal(p("what?!?!"), "what?!");
    assert.equal(p("what!?!?"), "what?!");
    assert.equal(p("やばい？？？"), "やばい？");
    assert.equal(p("ليه؟؟؟", "Arabic Egyptian"), "ليه؟");
  });

  test("keeps commas, periods, ellipses and em dashes as written and adds none", () => {
    for (const t of ["wait... what", "wait… what", "so — yeah", "ok, fine. go", "a,b"]) assert.equal(p(t), t);
    const plain = "deadass can't believe you missed that";
    assert.equal(p(plain, "New York Brooklyn"), plain);
  });

  test("never sends SSML; keeps the inner word of a tag", () => {
    assert.equal(p('hey <break time="1.5s"/> bro'), "hey bro");
    assert.equal(p('say <phoneme alphabet="ipa" ph="tə">tomato</phoneme> now'), "say tomato now");
    assert.equal(p("<speak>hi</speak>"), "hi");
    assert.ok(!/[<>]/.test(p('x <break time="1s"/> <prosody rate="slow">y</prosody>')));
  });

  test("no audio tags: bracketed tags are removed, none are added", () => {
    assert.equal(p("[laughs] nah fam [whispers] for real"), "nah fam for real");
    assert.ok(!p("lol thats mad").includes("["));
  });

  test("strips markdown and decorative symbols", () => {
    assert.equal(p("# yo\n> **bold** and _soft_ `code` ~~gone~~"), "yo\nbold and soft code gone");
    assert.equal(p("- first\n* second"), "first\nsecond");
    assert.equal(p("★ top ♥ spot ~ → here •"), "top spot here");
    assert.equal(p("snake_case_stays"), "snake_case_stays");
  });

  test("removes emoji incl. skin tones, flags, joiners and keycaps", () => {
    assert.equal(p("yo 👍🏽 bro 🇬🇧 👨‍👩‍👧 1️⃣"), "yo bro 1");
  });

  test("drops chat fillers as whole tokens only", () => {
    assert.equal(p("lol thats mad lmao"), "thats mad");
    assert.equal(p("lollipop and xdx stay"), "lollipop and xdx stay");
    assert.equal(p("www.example.com", "Tokyo Gyaru").includes("example"), true);
    assert.equal(p("kkk", "Rio Favela"), "");
    assert.equal(p("okk", "Rio Favela"), "okk"); // not a laughter token
    assert.equal(p("מחחחח", "Israeli Street"), "מחחחח"); // part of a word stays
  });

  test("keeps native letters and marks untouched (byte-identical)", () => {
    for (const [t, d] of [
      ["שָׁלוֹם אַחִי, מַה קּוֹרֶה?", "Israeli Street"],
      ["مَرْحَبًا يا صاحبي", "Arabic Egyptian"],
      ["ありがとう、カタカナもOK。", "Tokyo Gyaru"],
      ["Ёлки-палки, всё будет", "Russian Street"],
      ["Ça va, frérot ? Où ça ?", "Paris Banlieue"],
      ["coé, bora tomar uma? tá ligado", "Rio Favela"],
    ] as const) {
      assert.equal(p(t, d), t, t);
    }
  });

  test("keeps line breaks so addSpeechPunctuation can still turn them into pauses", () => {
    const t = "wagwan fam\nyou coming";
    assert.equal(p(t, "London Roadman"), t);
    assert.equal(addSpeechPunctuation(p(t, "London Roadman"), "London Roadman"), addSpeechPunctuation(t, "London Roadman"));
  });

  test("clean text is unchanged, so the existing speech punctuation behaves exactly as before", () => {
    for (const [t, d] of [
      ["Deadass can't believe you missed that", "New York Brooklyn"],
      ["wesh tu viens ce soir frérot", "Paris Banlieue"],
      ["neta wey no manches", "Mexico City Barrio"],
    ] as const) {
      assert.equal(addSpeechPunctuation(p(t, d), d), addSpeechPunctuation(t, d));
    }
  });

  test("idempotent", () => {
    const once = p("bro!!! 😂 lol thats **mad**???");
    assert.equal(p(once), once);
  });

  test("only emoji -> empty (nothing to read)", () => {
    assert.equal(p("😂😂😂"), "");
    assert.equal(p("🔥 ✨ ★"), "");
  });
});

describe("route: cleaned text is what ElevenLabs gets; the display text is untouched", () => {
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
  const req = (text: string, dialect: string) =>
    new NextRequest("https://example.test/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 200)}` },
      body: JSON.stringify({ text, dialect, engine: "minimax", ttsGender: "male" }),
    });

  test("messy London line reaches ElevenLabs cleaned (then speech punctuation applies)", async (t) => {
    isolate(t);
    const sent: string[] = [];
    t.mock.method(globalThis, "fetch", async (_u: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      sent.push(body.text);
      assert.ok(!/[<>*😂]/u.test(body.text));
      return new Response(new Uint8Array(4096), { status: 200, headers: { "Content-Type": "audio/mpeg" } });
    });
    t.mock.method(console, "info", () => {});
    const input = "bro!!! 😂😂 lol thats mad???";
    const res = await POST(req(input, "London Roadman"));
    assert.equal(res.status, 200);
    assert.deepEqual(sent, [addSpeechPunctuation("bro! thats mad?", "London Roadman")]);
  });

  test("emoji-only text never calls ElevenLabs", async (t) => {
    isolate(t);
    let calls = 0;
    t.mock.method(globalThis, "fetch", async () => {
      calls++;
      return new Response(new Uint8Array(4096), { status: 200 });
    });
    const res = await POST(req("😂😂😂", "London Roadman"));
    assert.equal(res.status, 422);
    assert.equal(calls, 0);
  });
});
