import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { MIN_TOKEN_CHARS, accessMode } from "../lib/access.ts";
import { catalogResponse, handleCompare } from "../lib/compareHandler.ts";
import { buildCatalog } from "../lib/models.ts";
import { MemoryCounterStore } from "../lib/rateLimit.ts";

const TOKEN = "t".repeat(MIN_TOKEN_CHARS);
const LIVE_ENV = {
  COMPARE_ACCESS_TOKEN: TOKEN,
  ANTHROPIC_API_KEY: "sk-ant-test",
  ANTHROPIC_MODEL_ID: "claude-sonnet-4-5",
};

function headers(extra: Record<string, string> = {}) {
  return new Headers({ "x-forwarded-for": "198.51.100.4", ...extra });
}

function deps(env: Record<string, string | undefined>) {
  const calls: string[] = [];
  return {
    calls,
    deps: {
      env,
      catalog: buildCatalog(env),
      store: new MemoryCounterStore(),
      callModel: async (_def: unknown, prompt: string) => {
        calls.push(prompt);
        return "live answer";
      },
    },
  };
}

const BODY = { prompt: "hello", modelIds: ["openai", "anthropic", "google"] };

describe("accessMode", () => {
  it("is demo when no access token is configured, whatever the caller sends", () => {
    assert.equal(accessMode(headers({ authorization: "Bearer " }), {}), "demo");
    assert.equal(accessMode(headers({ authorization: "Bearer undefined" }), {}), "demo");
  });

  it("fails closed when the configured token is too short to be a secret", () => {
    const env = { COMPARE_ACCESS_TOKEN: "short" };
    assert.equal(accessMode(headers({ authorization: "Bearer short" }), env), "demo");
  });

  it("is demo for a missing or wrong token and live only for the exact token", () => {
    const env = { COMPARE_ACCESS_TOKEN: TOKEN };
    assert.equal(accessMode(headers(), env), "demo");
    assert.equal(accessMode(headers({ authorization: `Bearer ${TOKEN}x` }), env), "demo");
    assert.equal(accessMode(headers({ authorization: TOKEN }), env), "demo");
    assert.equal(accessMode(headers({ authorization: `Bearer ${TOKEN}` }), env), "live");
  });
});

describe("POST /api/compare access gate", () => {
  it("never calls a provider for an anonymous caller, even when keys are set", async () => {
    const { calls, deps: d } = deps(LIVE_ENV);
    const res = await handleCompare(BODY, headers(), d);
    assert.equal(res.status, 200);
    assert.deepEqual(calls, []);
    const results = (res.body as { mode: string; results: { demo: boolean; text: string }[] });
    assert.equal(results.mode, "demo");
    assert.equal(results.results.length, 3);
    assert.ok(results.results.every((r) => r.demo === true && r.text.length > 0));
  });

  it("never calls a provider for a wrong token", async () => {
    const { calls, deps: d } = deps(LIVE_ENV);
    await handleCompare(BODY, headers({ authorization: "Bearer guess-guess-guess-guess" }), d);
    assert.deepEqual(calls, []);
  });

  it("calls configured providers only with the access token", async () => {
    const { calls, deps: d } = deps(LIVE_ENV);
    const res = await handleCompare(BODY, headers({ authorization: `Bearer ${TOKEN}` }), d);
    assert.equal(res.status, 200);
    assert.deepEqual(calls, ["hello"]);
    const body = res.body as { mode: string; results: { modelId: string; demo?: boolean; text?: string }[] };
    assert.equal(body.mode, "live");
    assert.equal(body.results.find((r) => r.modelId === "anthropic")?.text, "live answer");
    assert.ok(body.results.every((r) => !r.demo));
  });

  it("still validates input in demo mode", async () => {
    const { deps: d } = deps({});
    const res = await handleCompare({ prompt: "  ", modelIds: ["openai"] }, headers(), d);
    assert.equal(res.status, 400);
  });
});

describe("GET /api/compare catalogue", () => {
  it("reports demo mode with every lane selectable to anonymous callers", () => {
    const body = catalogResponse(headers(), LIVE_ENV, buildCatalog(LIVE_ENV));
    assert.equal(body.mode, "demo");
    assert.equal(body.models.length, 3);
    assert.equal(JSON.stringify(body).includes("sk-ant-test"), false);
  });

  it("reports live mode for the access token", () => {
    const body = catalogResponse(headers({ authorization: `Bearer ${TOKEN}` }), LIVE_ENV, buildCatalog(LIVE_ENV));
    assert.equal(body.mode, "live");
  });
});
