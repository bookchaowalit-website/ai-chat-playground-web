export type Provider = "openai" | "anthropic" | "google";

/** Why a lane can or cannot be run on this deployment. */
export type ModelStatus = "ready" | "missing-key" | "missing-model" | "invalid-model";

export interface ModelDef {
  /** Stable lane id (the provider), used by the UI and POST /api/compare. */
  id: Provider;
  provider: Provider;
  /** Provider model id from `modelEnv`, or null when unset/invalid. */
  modelId: string | null;
  label: string;
  /** Env var holding the provider API key. */
  envVar: string;
  /** Env var holding the provider model id. */
  modelEnv: string;
  status: ModelStatus;
  /** Operator-facing explanation when status is not "ready". */
  problem: string | null;
}

interface ProviderDef {
  provider: Provider;
  name: string;
  envVar: string;
  modelEnv: string;
}

/**
 * Provider lanes. There are deliberately no hard-coded default model ids:
 * providers retire ids on their own schedule, so each deployment names the
 * model it wants in OPENAI_MODEL_ID / ANTHROPIC_MODEL_ID / GOOGLE_MODEL_ID.
 * A lane without a model id (or with an invalid one) is shown but never called.
 */
export const PROVIDERS: readonly ProviderDef[] = [
  { provider: "openai", name: "OpenAI", envVar: "OPENAI_API_KEY", modelEnv: "OPENAI_MODEL_ID" },
  { provider: "anthropic", name: "Anthropic", envVar: "ANTHROPIC_API_KEY", modelEnv: "ANTHROPIC_MODEL_ID" },
  { provider: "google", name: "Google", envVar: "GOOGLE_GENERATIVE_AI_API_KEY", modelEnv: "GOOGLE_MODEL_ID" },
];

const MODEL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;

/**
 * Best-effort list of model id families the providers have already retired.
 * Catching these at startup gives a clear configuration error instead of a
 * provider 404 on every comparison. Not exhaustive: an id that passes can
 * still be retired later, which surfaces as a per-lane provider error.
 */
const RETIRED_MODEL_PATTERNS: readonly { provider: Provider; pattern: RegExp }[] = [
  { provider: "anthropic", pattern: /^claude-(2|instant|3-|3-5-|3-7-)/ },
  { provider: "google", pattern: /^(models\/)?gemini-1\.(0|5)-/ },
];

/** Validate a model id for a provider; returns an error message or null. */
export function modelIdProblem(provider: Provider, modelId: string, modelEnv: string): string | null {
  if (!MODEL_ID_PATTERN.test(modelId)) {
    return `${modelEnv} must be a provider model id (letters, digits, . _ : / -; at most 128 characters).`;
  }
  if (RETIRED_MODEL_PATTERNS.some((rule) => rule.provider === provider && rule.pattern.test(modelId))) {
    return `${modelEnv}="${modelId}" is a retired model; set it to a model the provider currently serves.`;
  }
  return null;
}

export function buildCatalog(env: Record<string, string | undefined> = process.env): ModelDef[] {
  return PROVIDERS.map((def) => {
    const raw = env[def.modelEnv]?.trim() || "";
    const hasKey = Boolean(env[def.envVar]?.trim());
    const base = { id: def.provider, provider: def.provider, envVar: def.envVar, modelEnv: def.modelEnv };
    if (!raw) {
      return {
        ...base,
        modelId: null,
        label: def.name,
        status: "missing-model" as const,
        problem: `Set ${def.modelEnv} to the ${def.name} model this lane should call.`,
      };
    }
    const problem = modelIdProblem(def.provider, raw, def.modelEnv);
    if (problem) {
      return { ...base, modelId: null, label: def.name, status: "invalid-model" as const, problem };
    }
    const label = `${def.name} · ${raw}`;
    if (!hasKey) {
      return { ...base, modelId: raw, label, status: "missing-key" as const, problem: `Set ${def.envVar} to enable this lane.` };
    }
    return { ...base, modelId: raw, label, status: "ready" as const, problem: null };
  });
}

export const MODEL_CATALOG: ModelDef[] = buildCatalog();

/** A lane is callable only when it has a valid model id and a provider key. */
export function isConfigured(model: ModelDef): model is ModelDef & { modelId: string } {
  return model.status === "ready" && model.modelId !== null;
}

/** Public, secret-free view of a lane for GET /api/compare and MCP list_models. */
export function describeModel(model: ModelDef) {
  return {
    id: model.id,
    label: model.label,
    provider: model.provider,
    modelId: model.modelId,
    configured: isConfigured(model),
    status: model.status,
    problem: model.problem,
  };
}
