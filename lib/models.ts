export interface ModelDef {
  id: string;
  label: string;
  provider: "openai" | "anthropic" | "google";
  envVar: string;
}

export const MODEL_CATALOG: ModelDef[] = [
  { id: "gpt-4o-mini", label: "GPT-4o mini", provider: "openai", envVar: "OPENAI_API_KEY" },
  { id: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku", provider: "anthropic", envVar: "ANTHROPIC_API_KEY" },
  { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", provider: "google", envVar: "GOOGLE_GENERATIVE_AI_API_KEY" },
];

export function isConfigured(model: ModelDef): boolean {
  return Boolean(process.env[model.envVar]);
}
