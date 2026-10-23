import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/mcp/route";

async function rpc(body: unknown) {
  const res = await POST(new Request("http://localhost/api/mcp", { method: "POST", body: JSON.stringify(body) }));
  return res.json();
}

describe("/api/mcp route", () => {
  it("echoes the id and exposes only the read-only list_models tool", async () => {
    const body = await rpc({ jsonrpc: "2.0", id: 12, method: "tools/list" });
    expect(body.id).toBe(12);
    expect(body.result.tools.map((t: { name: string }) => t.name)).toEqual(["list_models"]);
  });

  it("list_models reports each lane's real status and never calls a provider", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OPENAI_MODEL_ID", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const body = await rpc({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "list_models", arguments: {} } });
    const text = JSON.stringify(body.result);
    expect(text).toContain("openai");
    expect(text).not.toContain('"status":"ready"');
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("rejects an unknown tool instead of pretending to run a prompt", async () => {
    const body = await rpc({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "compare", arguments: { prompt: "hi" } } });
    expect(body.id).toBe(2);
    expect(body.error.code).toBeLessThan(0);
  });
});
