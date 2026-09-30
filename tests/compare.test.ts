import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_PROMPT_CHARS, clientKey, createRateLimiter, summarizeError, validateCompareRequest } from "../lib/compare.ts";
import { buildCatalog, describeModel, isConfigured, modelIdProblem } from "../lib/models.ts";

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
  it("has no hard-coded model ids: every lane needs its *_MODEL_ID", () => {
    const catalog = buildCatalog({ OPENAI_API_KEY: "k", ANTHROPIC_API_KEY: "k", GOOGLE_GENERATIVE_AI_API_KEY: "k" });
    assert.equal(catalog.length, 3);
    for (const model of catalog) {
      assert.equal(model.modelId, null);
      assert.equal(model.status, "missing-model");
      assert.equal(isConfigured(model), false);
      assert.match(model.problem ?? "", new RegExp(model.modelEnv));
    }
  });

  it("is ready only with both a valid model id and a key", () => {
    const withModel = buildCatalog({ ANTHROPIC_MODEL_ID: " custom-model " }).find((m) => m.provider === "anthropic")!;
    assert.equal(withModel.modelId, "custom-model");
    assert.equal(withModel.status, "missing-key");
    assert.match(withModel.problem ?? "", /ANTHROPIC_API_KEY/);
    assert.equal(isConfigured(withModel), false);

    const ready = buildCatalog({ ANTHROPIC_MODEL_ID: "custom-model", ANTHROPIC_API_KEY: "set" }).find((m) => m.provider === "anthropic")!;
    assert.equal(ready.status, "ready");
    assert.equal(ready.problem, null);
    assert.equal(isConfigured(ready), true);
    assert.equal(ready.id, "anthropic");
  });

  it("rejects malformed and known-retired model ids with a clear message", () => {
    const [openai, anthropic, google] = buildCatalog({
      OPENAI_MODEL_ID: "gpt 4 with spaces",
      OPENAI_API_KEY: "k",
      ANTHROPIC_MODEL_ID: "claude-3-5-haiku-latest",
      ANTHROPIC_API_KEY: "k",
      GOOGLE_MODEL_ID: "gemini-1.5-flash",
      GOOGLE_GENERATIVE_AI_API_KEY: "k",
    });
    assert.equal(openai.status, "invalid-model");
    assert.match(openai.problem ?? "", /OPENAI_MODEL_ID must be a provider model id/);
    assert.equal(anthropic.status, "invalid-model");
    assert.match(anthropic.problem ?? "", /retired/);
    assert.equal(google.status, "invalid-model");
    assert.equal(isConfigured(google), false);
  });

  it("does not flag current-generation ids as retired", () => {
    assert.equal(modelIdProblem("anthropic", "claude-haiku-4-5", "ANTHROPIC_MODEL_ID"), null);
    assert.equal(modelIdProblem("google", "gemini-2.5-flash", "GOOGLE_MODEL_ID"), null);
  });

  it("describes lanes without leaking key values", () => {
    const [lane] = buildCatalog({ OPENAI_MODEL_ID: "some-model", OPENAI_API_KEY: "sk-secret" });
    const described = describeModel(lane);
    assert.equal(JSON.stringify(described).includes("sk-secret"), false);
    assert.deepEqual(Object.keys(described).sort(), ["configured", "id", "label", "modelId", "problem", "provider", "status"]);
  });
});
