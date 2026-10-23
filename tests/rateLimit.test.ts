import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  DAY_MS,
  DEFAULT_DAILY_CAP,
  MemoryCounterStore,
  UpstashCounterStore,
  checkCompareLimits,
  createCounterStore,
  parseDailyCap,
  type CounterStore,
} from "../lib/rateLimit.ts";

const policy = (dailyCap: number | null, limit = 2) => ({ perClient: { limit, windowMs: 1000 }, dailyCap });

describe("MemoryCounterStore", () => {
  it("counts per key inside a fixed window and resets after it", async () => {
    const store = new MemoryCounterStore();
    assert.deepEqual(await store.increment("ip", 1000, 0), { count: 1, resetAt: 1000 });
    assert.equal((await store.increment("ip", 1000, 999)).count, 2);
    assert.equal((await store.increment("other", 1000, 999)).count, 1);
    assert.deepEqual(await store.increment("ip", 1000, 1000), { count: 1, resetAt: 2000 });
  });

  it("stays bounded in memory", async () => {
    const store = new MemoryCounterStore(3);
    for (let i = 0; i < 10; i++) await store.increment(`k${i}`, 1000, 0);
    // No throw and a fresh key still counts from 1.
    assert.equal((await store.increment("fresh", 1000, 0)).count, 1);
  });
});

describe("checkCompareLimits", () => {
  it("allows requests under both limits", async () => {
    assert.deepEqual(await checkCompareLimits(new MemoryCounterStore(), "ip", policy(10), 0), { ok: true });
  });

  it("returns 429 with Retry-After once a client exceeds its window", async () => {
    const store = new MemoryCounterStore();
    await checkCompareLimits(store, "ip", policy(10), 0);
    await checkCompareLimits(store, "ip", policy(10), 0);
    const denied = await checkCompareLimits(store, "ip", policy(10), 250);
    assert.equal(denied.ok, false);
    assert.equal(!denied.ok && denied.status, 429);
    assert.equal(!denied.ok && denied.retryAfterSeconds, 1);
    assert.equal((await checkCompareLimits(store, "other", policy(10), 250)).ok, true);
  });

  it("enforces the deployment-wide daily cap across clients", async () => {
    const store = new MemoryCounterStore();
    const now = 5 * DAY_MS + 1000;
    assert.equal((await checkCompareLimits(store, "a", policy(2), now)).ok, true);
    assert.equal((await checkCompareLimits(store, "b", policy(2), now)).ok, true);
    const denied = await checkCompareLimits(store, "c", policy(2), now);
    assert.equal(denied.ok, false);
    assert.match(!denied.ok ? denied.error : "", /daily/);
    assert.equal(!denied.ok && denied.retryAfterSeconds, DAY_MS / 1000 - 1);
    // Next UTC day starts a new budget.
    assert.equal((await checkCompareLimits(store, "c", policy(2), 6 * DAY_MS)).ok, true);
  });

  it("does not spend the daily budget on per-client rejections", async () => {
    const store = new MemoryCounterStore();
    for (let i = 0; i < 5; i++) await checkCompareLimits(store, "spammer", policy(3, 1), 0);
    assert.equal((await checkCompareLimits(store, "a", policy(3, 1), 0)).ok, true);
    assert.equal((await checkCompareLimits(store, "b", policy(3, 1), 0)).ok, true);
  });

  it("fails closed when the cap is misconfigured", async () => {
    const decision = await checkCompareLimits(new MemoryCounterStore(), "ip", policy(null), 0);
    assert.deepEqual(decision.ok ? null : decision.status, 503);
  });

  it("fails closed when the counter store errors", async () => {
    const broken: CounterStore = {
      kind: "upstash",
      increment: async () => {
        throw new Error("down");
      },
    };
    const decision = await checkCompareLimits(broken, "ip", policy(10), 0);
    assert.equal(decision.ok ? null : decision.status, 503);
  });
});

describe("parseDailyCap", () => {
  it("defaults when unset and accepts positive integers", () => {
    assert.equal(parseDailyCap(undefined), DEFAULT_DAILY_CAP);
    assert.equal(parseDailyCap("  "), DEFAULT_DAILY_CAP);
    assert.equal(parseDailyCap(" 25 "), 25);
  });
  it("treats anything else as misconfigured", () => {
    for (const v of ["0", "-1", "1.5", "ten", "1e3", "99999999999999999999"]) assert.equal(parseDailyCap(v), null, v);
  });
});

describe("createCounterStore", () => {
  it("uses memory without Upstash/KV env and Upstash when both vars are set", () => {
    assert.equal(createCounterStore({}).kind, "memory");
    assert.equal(createCounterStore({ UPSTASH_REDIS_REST_URL: "https://x.test" }).kind, "memory");
    assert.equal(createCounterStore({ UPSTASH_REDIS_REST_URL: "https://x.test", UPSTASH_REDIS_REST_TOKEN: "t" }).kind, "upstash");
    assert.equal(createCounterStore({ KV_REST_API_URL: "https://x.test", KV_REST_API_TOKEN: "t" }).kind, "upstash");
  });
});

describe("UpstashCounterStore", () => {
  it("INCRs a window-scoped key through the REST pipeline", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const store = new UpstashCounterStore({
      url: "https://kv.example.test/",
      token: "test-token",
      fetch: async (url, init) => {
        calls.push({ url, init });
        return new Response(JSON.stringify([{ result: 3 }, { result: 1 }]), { status: 200 });
      },
    });
    assert.deepEqual(await store.increment("client:ip", 1000, 2500), { count: 3, resetAt: 3000 });
    assert.equal(calls[0].url, "https://kv.example.test/pipeline");
    assert.equal((calls[0].init.headers as Record<string, string>).Authorization, "Bearer test-token");
    assert.deepEqual(JSON.parse(String(calls[0].init.body)), [
      ["INCR", "model-bench:client:ip:2"],
      ["PEXPIRE", "model-bench:client:ip:2", "2000"],
    ]);
  });

  it("throws on HTTP or protocol errors so callers fail closed", async () => {
    const failing = (body: unknown, status = 200) =>
      new UpstashCounterStore({
        url: "https://kv.example.test",
        token: "t",
        fetch: async () => new Response(JSON.stringify(body), { status }),
      });
    await assert.rejects(failing([{ result: 1 }], 500).increment("k", 1000, 0));
    await assert.rejects(failing([{ error: "WRONGTYPE" }]).increment("k", 1000, 0));
    await assert.rejects(failing({ nope: true }).increment("k", 1000, 0));
    const decision = await checkCompareLimits(failing([], 401), "ip", policy(10), 0);
    assert.equal(decision.ok ? null : decision.status, 503);
  });
});
