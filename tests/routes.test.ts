import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/compare/route";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function compare(body: string, headers: Record<string, string> = {}) {
  return POST(new NextRequest("http://localhost/api/compare", { method: "POST", body, headers: { "content-type": "application/json", ...headers } }));
}

describe("/api/compare route", () => {
  it("GET reports demo mode without an access token and is not cached", async () => {
    vi.stubEnv("COMPARE_ACCESS_TOKEN", "");
    const res = await GET(new NextRequest("http://localhost/api/compare"));
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect((await res.json()).mode).toBe("demo");
  });

  it("POST answers demo lanes without calling any provider", async () => {
    vi.stubEnv("COMPARE_ACCESS_TOKEN", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = await compare(JSON.stringify({ prompt: "Say hi", modelIds: ["openai"] }), { "x-forwarded-for": "198.51.100.9" });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(JSON.stringify(body)).toContain("demo");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("POST rejects a body that is not JSON", async () => {
    const res = await compare("{nope");
    expect(res.status).toBe(400);
  });
});

describe("robots and sitemap", () => {
  it("point at the canonical site", () => {
    expect(JSON.stringify(robots())).toContain("sitemap.xml");
    expect(sitemap()[0].url).toMatch(/^https:\/\//);
  });
});
