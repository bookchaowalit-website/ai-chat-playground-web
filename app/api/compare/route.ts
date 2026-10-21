import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { MODEL_CATALOG, type ModelDef } from "@/lib/models";
import { MAX_OUTPUT_TOKENS, REQUEST_TIMEOUT_MS } from "@/lib/compare";
import { catalogResponse, handleCompare } from "@/lib/compareHandler";
import { createCounterStore } from "@/lib/rateLimit";

// Durable (Upstash/Vercel KV) when configured, otherwise per-instance memory.
const counterStore = createCounterStore();

function resolveModel(def: ModelDef, modelId: string) {
  switch (def.provider) {
    case "openai":
      return openai(modelId);
    case "anthropic":
      return anthropic(modelId);
    case "google":
      return google(modelId);
  }
}

async function callModel(def: ModelDef & { modelId: string }, prompt: string) {
  const { text } = await generateText({
    model: resolveModel(def, def.modelId),
    prompt,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  return text;
}

export async function GET(req: NextRequest) {
  return NextResponse.json(catalogResponse(req.headers, process.env, MODEL_CATALOG), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  // Provider keys are spent only for callers with COMPARE_ACCESS_TOKEN;
  // everyone else gets demo lanes (see lib/access.ts).
  const res = await handleCompare(body, req.headers, {
    env: process.env,
    catalog: MODEL_CATALOG,
    store: counterStore,
    callModel,
  });
  return NextResponse.json(res.body, { status: res.status, headers: res.headers });
}
