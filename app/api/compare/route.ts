import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { MODEL_CATALOG, isConfigured, type ModelDef } from "@/lib/models";
import {
  MAX_OUTPUT_TOKENS,
  REQUEST_TIMEOUT_MS,
  clientKey,
  createRateLimiter,
  summarizeError,
  validateCompareRequest,
} from "@/lib/compare";

// Best-effort per-instance limit: 10 comparisons per client per minute.
const allowRequest = createRateLimiter(10, 60_000);

function resolveModel(def: ModelDef) {
  switch (def.provider) {
    case "openai":
      return openai(def.id);
    case "anthropic":
      return anthropic(def.id);
    case "google":
      return google(def.id);
  }
}

export async function GET() {
  return NextResponse.json({
    models: MODEL_CATALOG.map((m) => ({ id: m.id, label: m.label, provider: m.provider, configured: isConfigured(m) })),
  });
}

export async function POST(req: NextRequest) {
  if (!allowRequest(clientKey(req.headers))) {
    return NextResponse.json({ error: "Too many comparisons. Wait a minute and try again." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const validation = validateCompareRequest(body, MODEL_CATALOG.map((m) => m.id));
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const { prompt, modelIds } = validation.value;
  const selected = MODEL_CATALOG.filter((m) => modelIds.includes(m.id));

  const results = await Promise.all(
    selected.map(async (def) => {
      if (!isConfigured(def)) {
        return { modelId: def.id, label: def.label, configured: false as const };
      }
      const start = Date.now();
      try {
        const { text } = await generateText({
          model: resolveModel(def),
          prompt,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          maxRetries: 1,
          abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        return { modelId: def.id, label: def.label, configured: true as const, text, ms: Date.now() - start };
      } catch (err) {
        return {
          modelId: def.id,
          label: def.label,
          configured: true as const,
          error: summarizeError(err),
          ms: Date.now() - start,
        };
      }
    })
  );

  return NextResponse.json({ results });
}
