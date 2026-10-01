import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ERROR_CODES, handleMcpMessage, requireString, respondToMcpRequest } from "../lib/mcp.ts";
import type { McpTool } from "../lib/mcp.ts";

const server = { name: "test-server", version: "0.0.0" };
const tools: McpTool[] = [
  {
    name: "echo",
    description: "Echo text back",
    inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
    handler: (args) => requireString(args, "text"),
  },
];

describe("mcp json-rpc handler", () => {
  it("answers initialize with server info", async () => {
    const response = await handleMcpMessage({ jsonrpc: "2.0", id: 1, method: "initialize" }, server, tools);
    assert.deepEqual((response?.result as { serverInfo: unknown }).serverInfo, server);
  });

  it("lists tools without exposing handlers", async () => {
    const response = await handleMcpMessage({ jsonrpc: "2.0", id: 2, method: "tools/list" }, server, tools);
    const listed = (response?.result as { tools: Record<string, unknown>[] }).tools;
    assert.equal(listed.length, 1);
    assert.equal(listed[0].name, "echo");
    assert.equal("handler" in listed[0], false);
  });

  it("calls a tool and wraps the result as text content", async () => {
    const response = await handleMcpMessage(
      { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "echo", arguments: { text: "hi" } } },
      server,
      tools,
    );
    assert.deepEqual(response?.result, { content: [{ type: "text", text: "hi" }] });
  });

  it("reports tool input errors as isError results", async () => {
    const response = await handleMcpMessage(
      { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "echo", arguments: {} } },
      server,
      tools,
    );
    assert.equal((response?.result as { isError: boolean }).isError, true);
  });

  it("rejects unknown tools and methods with JSON-RPC errors", async () => {
    const unknownTool = await handleMcpMessage(
      { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "nope" } },
      server,
      tools,
    );
    assert.equal(unknownTool?.error?.code, ERROR_CODES.invalidParams);
    const unknownMethod = await handleMcpMessage({ jsonrpc: "2.0", id: 6, method: "nope" }, server, tools);
    assert.equal(unknownMethod?.error?.code, ERROR_CODES.methodNotFound);
  });

  it("rejects malformed requests and ignores notifications", async () => {
    const invalid = await handleMcpMessage({ id: 7 }, server, tools);
    assert.equal(invalid?.error?.code, ERROR_CODES.invalidRequest);
    const notification = await handleMcpMessage(
      { jsonrpc: "2.0", method: "notifications/initialized" },
      server,
      tools,
    );
    assert.equal(notification, null);
  });

  it("returns HTTP 400 for unparseable bodies and 202 for notifications", async () => {
    const bad = await respondToMcpRequest(new Request("http://x/api/mcp", { method: "POST", body: "{" }), server, tools);
    assert.equal(bad.status, 400);
    const note = await respondToMcpRequest(
      new Request("http://x/api/mcp", {
        method: "POST",
        body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
      }),
      server,
      tools,
    );
    assert.equal(note.status, 202);
  });
});
