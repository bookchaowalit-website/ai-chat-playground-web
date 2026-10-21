import { accessMode } from "./access.ts";
import { clientKey, summarizeError, validateCompareRequest } from "./compare.ts";
import { describeModel, isConfigured, type ModelDef } from "./models.ts";
import { checkCompareLimits, parseDailyCap, type CounterStore } from "./rateLimit.ts";

type Env = Record<string, string | undefined>;

export interface CompareDeps {
  env: Env;
  catalog: ModelDef[];
  store: CounterStore;
  callModel: (def: ModelDef & { modelId: string }, prompt: string) => Promise<string>;
}

export interface HandlerResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

const PER_CLIENT = { limit: 10, windowMs: 60_000 };

export function catalogResponse(headers: Headers, env: Env, catalog: ModelDef[]) {
  return { mode: accessMode(headers, env), models: catalog.map(describeModel) };
}

/** A clearly labelled stand-in answer; no provider is called and no key is used. */
export function demoText(def: ModelDef, prompt: string): string {
  const words = prompt.split(/\s+/).filter(Boolean).length;
  return (
    `Demo lane: no ${def.label.split(" · ")[0]} model was called. ` +
    `Your prompt (${words} words, ${prompt.length} characters) would be sent to this lane in live mode. ` +
    "Live comparisons need the bench access key."
  );
}

export async function handleCompare(body: unknown, headers: Headers, deps: CompareDeps): Promise<HandlerResponse> {
  const validation = validateCompareRequest(body, deps.catalog.map((m) => m.id));
  if (!validation.ok) return { status: 400, body: { error: validation.error } };

  if (accessMode(headers, deps.env) !== "live") {
    const { prompt, modelIds } = validation.value;
    const results = deps.catalog
      .filter((m) => modelIds.includes(m.id))
      .map((def) => ({ modelId: def.id, label: def.label, configured: false as const, demo: true as const, text: demoText(def, prompt) }));
    return { status: 200, body: { mode: "demo", results } };
  }

  const limit = await checkCompareLimits(deps.store, clientKey(headers), {
    perClient: PER_CLIENT,
    dailyCap: parseDailyCap(deps.env.COMPARE_DAILY_REQUEST_CAP),
  });
  if (!limit.ok) {
    const h = limit.retryAfterSeconds ? { "Retry-After": String(limit.retryAfterSeconds) } : undefined;
    return { status: limit.status, body: { error: limit.error }, headers: h };
  }
  const { prompt, modelIds } = validation.value;
  const selected = deps.catalog.filter((m) => modelIds.includes(m.id));
  const results = await Promise.all(
    selected.map(async (def) => {
      if (!isConfigured(def)) {
        return { modelId: def.id, label: def.label, configured: false as const, error: def.problem ?? "This lane is not configured." };
      }
      const start = Date.now();
      try {
        const text = await deps.callModel(def, prompt);
        return { modelId: def.id, label: def.label, configured: true as const, text, ms: Date.now() - start };
      } catch (err) {
        return { modelId: def.id, label: def.label, configured: true as const, error: summarizeError(err), ms: Date.now() - start };
      }
    })
  );
  return { status: 200, body: { mode: "live", results } };
}
