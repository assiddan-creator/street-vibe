/**
 * Lemon Squeezy webhook helpers: subscription status → plan, and the
 * `X-Signature` HMAC check.
 *
 *     npm test
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "crypto";

import { planForStatus, verifyWebhookSignature } from "../lib/lemonSqueezy";

describe("planForStatus", () => {
  test("paying and grace-period statuses keep Pro", () => {
    for (const s of ["active", "on_trial", "past_due", "cancelled"]) {
      assert.equal(planForStatus(s), "pro", s);
    }
  });

  test("ended or unpaid statuses drop to free", () => {
    for (const s of ["expired", "unpaid", "paused", "", "ACTIVE"]) {
      assert.equal(planForStatus(s), "free", s);
    }
  });

  test("non-string status is free", () => {
    assert.equal(planForStatus(undefined), "free");
    assert.equal(planForStatus(1), "free");
  });
});

describe("verifyWebhookSignature", () => {
  const body = '{"meta":{"event_name":"subscription_updated"}}';

  test("accepts the HMAC of the raw body and rejects anything else", () => {
    const prev = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET = "test-secret";
    try {
      const good = createHmac("sha256", "test-secret").update(body).digest("hex");
      assert.equal(verifyWebhookSignature(body, good), true);
      assert.equal(verifyWebhookSignature(body + " ", good), false);
      assert.equal(verifyWebhookSignature(body, "00" + good.slice(2)), false);
      assert.equal(verifyWebhookSignature(body, "not-hex"), false);
      assert.equal(verifyWebhookSignature(body, null), false);
    } finally {
      if (prev === undefined) delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
      else process.env.LEMONSQUEEZY_WEBHOOK_SECRET = prev;
    }
  });

  test("rejects everything when no secret is configured", () => {
    const prev = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    try {
      assert.equal(verifyWebhookSignature(body, "ab"), false);
    } finally {
      if (prev !== undefined) process.env.LEMONSQUEEZY_WEBHOOK_SECRET = prev;
    }
  });
});
