import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { MODEL_CATALOG, isConfigured, type ModelDef } from "@/lib/models";

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
  const { prompt, modelIds } = (await req.json()) as { prompt?: string; modelIds?: string[] };

  if (!prompt || !prompt.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const selected = MODEL_CATALOG.filter((m) => (modelIds ?? []).includes(m.id));

  const results = await Promise.all(
    selected.map(async (def) => {
      if (!isConfigured(def)) {
        return { modelId: def.id, label: def.label, configured: false as const };
      }
      const start = Date.now();
      try {
        const { text } = await generateText({ model: resolveModel(def), prompt });
        return {
          modelId: def.id,
          label: def.label,
          configured: true as const,
          text,
          ms: Date.now() - start,
        };
      } catch (err) {
        return {
          modelId: def.id,
          label: def.label,
          configured: true as const,
          error: err instanceof Error ? err.message : "Request failed",
          ms: Date.now() - start,
        };
      }
    })
  );

  return NextResponse.json({ results });
}
