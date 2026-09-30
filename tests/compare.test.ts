import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_PROMPT_CHARS, clientKey, createRateLimiter, summarizeError, validateCompareRequest } from "../lib/compare.ts";
import { buildCatalog, isConfigured } from "../lib/models.ts";

const known = ["a", "b"];

describe("validateCompareRequest", () => {
  it("accepts a prompt with known, de-duplicated model ids", () => {
    assert.deepEqual(validateCompareRequest({ prompt: " hi ", modelIds: ["a", "a", "zzz", "b"] }, known), {
      ok: true,
      value: { prompt: "hi", modelIds: ["a", "b"] },
    });
  });

  it("rejects missing, oversized, or malformed input", () => {
    assert.equal(validateCompareRequest(null, known).ok, false);
    assert.equal(validateCompareRequest({ prompt: "   ", modelIds: ["a"] }, known).ok, false);
    assert.equal(validateCompareRequest({ prompt: "x".repeat(MAX_PROMPT_CHARS + 1), modelIds: ["a"] }, known).ok, false);
    assert.equal(validateCompareRequest({ prompt: "x", modelIds: "a" }, known).ok, false);
    assert.equal(validateCompareRequest({ prompt: "x", modelIds: [1] }, known).ok, false);
    assert.equal(validateCompareRequest({ prompt: "x", modelIds: ["zzz"] }, known).ok, false);
  });
});

describe("limits", () => {
  it("rate-limits per key inside a window", () => {
    const allow = createRateLimiter(2, 1000);
    assert.equal(allow("ip", 0), true);
    assert.equal(allow("ip", 1), true);
    assert.equal(allow("ip", 2), false);
    assert.equal(allow("other", 2), true);
    assert.equal(allow("ip", 1001), true);
  });

  it("truncates long provider errors", () => {
    assert.ok(summarizeError(new Error("e".repeat(1000))).length <= 301);
    assert.equal(summarizeError("x"), "Request failed");
  });

  it("derives a client key from proxy headers", () => {
    assert.equal(clientKey(new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" })), "1.2.3.4");
    assert.equal(clientKey(new Headers()), "anonymous");
  });
});

describe("model catalogue", () => {
  it("allows per-provider model id overrides", () => {
    const catalog = buildCatalog({ ANTHROPIC_MODEL_ID: "custom-model" });
    assert.equal(catalog.find((m) => m.provider === "anthropic")?.id, "custom-model");
    assert.equal(catalog.find((m) => m.provider === "openai")?.id, buildCatalog({})[0].id);
  });

  it("reports configuration from the key env var only", () => {
    const [model] = buildCatalog({});
    assert.equal(isConfigured(model, {}), false);
    assert.equal(isConfigured(model, { [model.envVar]: "set" }), true);
  });
});
