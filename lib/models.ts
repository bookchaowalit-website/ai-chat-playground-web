export interface ModelDef {
  id: string;
  label: string;
  provider: "openai" | "anthropic" | "google";
  envVar: string;
}

/**
 * Default catalogue. Each provider's model id can be overridden at deploy time
 * (e.g. when a default is retired) via OPENAI_MODEL_ID, ANTHROPIC_MODEL_ID or
 * GOOGLE_MODEL_ID without a code change.
 */
const DEFAULT_CATALOG: ModelDef[] = [
  { id: "gpt-4o-mini", label: "GPT-4o mini", provider: "openai", envVar: "OPENAI_API_KEY" },
  { id: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku", provider: "anthropic", envVar: "ANTHROPIC_API_KEY" },
  { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", provider: "google", envVar: "GOOGLE_GENERATIVE_AI_API_KEY" },
];

const OVERRIDE_ENV: Record<ModelDef["provider"], string> = {
  openai: "OPENAI_MODEL_ID",
  anthropic: "ANTHROPIC_MODEL_ID",
  google: "GOOGLE_MODEL_ID",
};

export function buildCatalog(env: Record<string, string | undefined> = process.env): ModelDef[] {
  return DEFAULT_CATALOG.map((model) => {
    const override = env[OVERRIDE_ENV[model.provider]]?.trim();
    return override ? { ...model, id: override, label: override } : model;
  });
}

export const MODEL_CATALOG: ModelDef[] = buildCatalog();

export function isConfigured(model: ModelDef, env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env[model.envVar]);
}
