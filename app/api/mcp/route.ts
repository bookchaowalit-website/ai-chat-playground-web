import { MODEL_CATALOG, describeModel } from "@/lib/models";
import { respondToMcpRequest } from "@/lib/mcp";
import type { McpTool } from "@/lib/mcp";

const SERVER = { name: "bookchaowalit-chat-playground", version: "0.2.0" };

// Read-only on purpose: running prompts through MCP would bypass the page's
// limits and spend provider credit, so only the catalogue is exposed.
const TOOLS: McpTool[] = [
  {
    name: "list_models",
    description: "List the model channels on the bench the model id each deployment configured, and whether the lane is ready (with the reason when it is not).",
    inputSchema: { type: "object", properties: {} },
    handler: () => MODEL_CATALOG.map(describeModel),
  },
];

export async function POST(request: Request) {
  return respondToMcpRequest(request, SERVER, TOOLS);
}
