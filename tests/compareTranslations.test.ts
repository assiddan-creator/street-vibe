import { test } from "node:test";
import assert from "node:assert/strict";
import { createComparisonController, comparisonDialects, requestCompareCity, type CompareRow, type CompareSettings } from "../lib/compareTranslations";

const input: CompareSettings = { text: "See you tonight", slangLevel: 2, context: "dm", sourceLanguage: "en-US", uiLocale: "en" };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const tick = () => new Promise<void>(r => setImmediate(r));
function harness() {
  let rows: CompareRow[] = [];
  const calls: { settings: CompareSettings; dialect: string; response: ReturnType<typeof deferred<{ text: string }>> }[] = [];
  const controller = createComparisonController((settings, dialect) => {
    const response = deferred<{ text: string }>();
    calls.push({ settings, dialect, response });
    return response.promise;
  }, next => { rows = next; });
  return { controller, calls, rows: () => rows };
}

test("comparison always selects three distinct destinations", () => {
  for (const primary of ["London Roadman", "Jamaican Patois", "Tokyo Gyaru"]) {
    const dialects = comparisonDialects(primary);
    assert.equal(dialects.length, 3);
    assert.equal(new Set(dialects).size, 3);
    assert.equal(dialects[0], primary);
  }
});

test("successful cities appear before the slowest request and survive a failure", async () => {
  const h = harness();
  const done = h.controller.start(input, "London Roadman");
  assert.equal(h.rows().filter(r => r.status === "pending").length, 3);
  h.calls[0].response.resolve({ text: "London result" });
  await tick();
  assert.equal(h.rows()[0].text, "London result");
  assert.equal(h.rows()[1].status, "pending");
  h.calls[1].response.reject(new Error("Quota reached"));
  h.calls[2].response.resolve({ text: "Israel result" });
  await done;
  assert.deepEqual(h.rows().map(r => r.status), ["success", "error", "success"]);
  assert.equal(h.rows()[1].error, "Quota reached");
});

test("retry requests only the failed city with original settings and blocks duplicate clicks", async () => {
  const h = harness();
  const mutable = { ...input };
  const done = h.controller.start(mutable, "London Roadman");
  mutable.text = "Different message";
  mutable.context = "flirt";
  h.calls[0].response.resolve({ text: "London result" });
  h.calls[1].response.reject(new Error("Unavailable"));
  h.calls[2].response.resolve({ text: "Israel result" });
  await done;
  const retry = h.controller.retry(h.calls[1].dialect);
  await h.controller.retry(h.calls[1].dialect);
  await h.controller.retry(h.calls[0].dialect);
  assert.equal(h.calls.length, 4);
  assert.deepEqual(h.calls[3].settings, input);
  assert.equal(h.calls[3].dialect, h.calls[1].dialect);
  assert.equal(h.rows()[0].text, "London result");
  h.calls[3].response.resolve({ text: "Recovered result" });
  await retry;
  assert.deepEqual(h.rows().map(r => r.status), ["success", "success", "success"]);
});

test("clear ignores late results and disables retry", async () => {
  const h = harness();
  const done = h.controller.start(input, "London Roadman");
  h.controller.clear();
  h.calls.forEach(call => call.response.resolve({ text: "Late result" }));
  await done;
  await h.controller.retry("London Roadman");
  assert.deepEqual(h.rows(), []);
  assert.equal(h.calls.length, 3);
});

test("a replaced comparison cannot be overwritten by old requests", async () => {
  const h = harness();
  const old = h.controller.start(input, "London Roadman");
  const fresh = h.controller.start({ ...input, text: "New" }, "Tokyo Gyaru");
  h.calls.slice(0, 3).forEach(call => call.response.resolve({ text: "Old" }));
  await old;
  assert.ok(h.rows().every(r => r.status === "pending"));
  h.calls.slice(3).forEach(call => call.response.resolve({ text: "New" }));
  await fresh;
  assert.ok(h.rows().every(r => r.text === "New"));
});

test("an empty city response becomes retryable", async () => {
  const h = harness();
  const done = h.controller.start(input, "London Roadman");
  h.calls.forEach(call => call.response.resolve({ text: " " }));
  await done;
  assert.ok(h.rows().every(r => r.status === "error"));
});

test("request uses the captured settings and propagates server failure", async t => {
  const fetch = t.mock.method(globalThis, "fetch", async (_url: string, options: RequestInit) => {
    const body = JSON.parse(options.body as string);
    assert.equal(body.text, input.text);
    assert.equal(body.currentLang, "London Roadman");
    return new Response(JSON.stringify({ error: "Daily limit reached" }), { status: 429 });
  });
  await assert.rejects(requestCompareCity(input, "London Roadman"), /Daily limit reached/);
  assert.equal(fetch.mock.callCount(), 1);
});
