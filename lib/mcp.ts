/**
 * Minimal, dependency-free JSON-RPC 2.0 handler for the app's `/api/mcp`
 * endpoint. It implements the MCP subset this app needs: `initialize`, `ping`,
 * `tools/list`, `tools/call`, and ignores notifications.
 */

export type JsonRpcId = string | number | null;

export type ToolArgs = Record<string, unknown>;

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (args: ToolArgs) => unknown | Promise<unknown>;
}

export interface McpServerInfo {
  name: string;
  version: string;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: { code: number; message: string };
}

export const PROTOCOL_VERSION = "2024-11-05";

export const ERROR_CODES = {
  parseError: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
} as const;

export class ToolInputError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function rpcError(id: JsonRpcId, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

/** Read a required string argument, throwing a readable error when missing. */
export function requireString(args: ToolArgs, key: string): string {
  const value = args[key];
  if (typeof value !== "string") {
    throw new ToolInputError(`Argument "${key}" must be a string.`);
  }
  return value;
}

/** Read an optional string argument. */
export function optionalString(args: ToolArgs, key: string): string | undefined {
  const value = args[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new ToolInputError(`Argument "${key}" must be a string when provided.`);
  }
  return value;
}

function toText(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

/**
 * Handle one JSON-RPC message. Returns `null` for notifications, which must
 * not receive a response body.
 */
export async function handleMcpMessage(
  message: unknown,
  server: McpServerInfo,
  tools: readonly McpTool[],
): Promise<JsonRpcResponse | null> {
  if (!isRecord(message) || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    const id = isRecord(message) && (typeof message.id === "string" || typeof message.id === "number") ? message.id : null;
    return rpcError(id, ERROR_CODES.invalidRequest, "Invalid JSON-RPC 2.0 request.");
  }

  const { method } = message;
  const hasId = typeof message.id === "string" || typeof message.id === "number";
  if (!hasId) {
    // Notifications (e.g. notifications/initialized) are acknowledged silently.
    return null;
  }
  const id = message.id as string | number;
  const params = isRecord(message.params) ? message.params : {};

  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: server,
        },
      };
    case "ping":
      return { jsonrpc: "2.0", id, result: {} };
    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
        },
      };
    case "tools/call": {
      const tool = tools.find((candidate) => candidate.name === params.name);
      if (!tool) {
        return rpcError(id, ERROR_CODES.invalidParams, `Unknown tool: ${String(params.name)}`);
      }
      const args = isRecord(params.arguments) ? params.arguments : {};
      try {
        const value = await tool.handler(args);
        return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: toText(value) }] } };
      } catch (error) {
        const text = error instanceof Error ? error.message : "Tool failed.";
        return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text }], isError: true } };
      }
    }
    default:
      return rpcError(id, ERROR_CODES.methodNotFound, `Method not found: ${method}`);
  }
}

/** Shared HTTP wrapper used by `app/api/mcp/route.ts`. */
export async function respondToMcpRequest(
  request: Request,
  server: McpServerInfo,
  tools: readonly McpTool[],
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(rpcError(null, ERROR_CODES.parseError, "Request body must be valid JSON."), { status: 400 });
  }
  const response = await handleMcpMessage(body, server, tools);
  if (response === null) {
    return new Response(null, { status: 202 });
  }
  return Response.json(response);
}
