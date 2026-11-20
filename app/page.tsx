"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { AppFoot, AppTop, Pill, type Tone } from "@/components/app-shell";
import { MAX_PROMPT_CHARS, hasVisibleText } from "@/lib/compare";

interface ModelStatus {
  id: string;
  label: string;
  provider: string;
  configured: boolean;
  status: "ready" | "missing-key" | "missing-model" | "invalid-model";
  problem: string | null;
}

const STATUS_LABEL: Record<ModelStatus["status"], string> = {
  ready: "Available",
  "missing-key": "Needs key",
  "missing-model": "Needs model id",
  "invalid-model": "Invalid model id",
};

type AccessMode = "live" | "demo";

const ACCESS_KEY_STORAGE = "model-bench-access-key";

function readStoredKey(): string {
  try {
    return sessionStorage.getItem(ACCESS_KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

function storeKey(value: string) {
  try {
    if (value) sessionStorage.setItem(ACCESS_KEY_STORAGE, value);
    else sessionStorage.removeItem(ACCESS_KEY_STORAGE);
  } catch {
    // Private mode or blocked storage: the key just is not remembered.
  }
}

function authHeaders(accessKey: string): Record<string, string> {
  return accessKey ? { Authorization: "Bearer " + accessKey } : {};
}

interface CompareResult {
  modelId: string;
  label: string;
  configured: boolean;
  demo?: boolean;
  text?: string;
  error?: string;
  ms?: number;
}

const SAMPLE_PROMPT = "Explain one trade-off in designing a calm developer tool.";
const SOURCE = "https://github.com/bookchaowalit-website/ai-chat-playground-web";

function resultTag(result: CompareResult): { tone: Tone; text: string } {
  if (result.error) return { tone: "red", text: "Error" };
  if (result.demo) return { tone: "amber", text: "Demo, no model called" };
  return { tone: "green", text: result.ms !== undefined ? result.ms + " ms" : "Answered" };
}

export default function Home() {
  const [models, setModels] = useState<ModelStatus[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [prompt, setPrompt] = useState("");
  const [results, setResults] = useState<CompareResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<AccessMode>("demo");
  // Lazy read: the key is only sent in request headers, never rendered, so SSR "" cannot mismatch.
  const [accessKey, setAccessKey] = useState(readStoredKey);
  const [keyDraft, setKeyDraft] = useState("");
  const [keyNote, setKeyNote] = useState("");
  const promptRef = useRef<HTMLTextAreaElement>(null);
  // Only the newest catalogue request may set the mode: a slow keyless load finishing after an
  // unlock must not flip the page back to Demo while the live key is still held.
  const catalogRequest = useRef(0);

  const loadCatalog = useCallback(async (key: string) => {
    const request = ++catalogRequest.current;
    try {
      const response = await fetch("/api/compare", { headers: authHeaders(key), cache: "no-store" });
      const data: { mode?: AccessMode; models: ModelStatus[] } = await response.json();
      const nextMode = data.mode === "live" ? "live" : "demo";
      if (request !== catalogRequest.current) return nextMode;
      setModels(data.models);
      setMode(nextMode);
      // Demo lanes never call a provider, so every lane can be armed.
      setSelected(new Set(data.models.filter((model) => nextMode === "demo" || model.configured).map((model) => model.id)));
      return nextMode;
    } catch {
      if (request !== catalogRequest.current) return "demo" as const;
      setError("The model list could not be read. Refresh to try again.");
      return "demo" as const;
    }
  }, []);

  useEffect(() => {
    // Load after mount; state is only set once the catalogue request resolves.
    void Promise.resolve(readStoredKey()).then(loadCatalog);
  }, [loadCatalog]);

  const unlock = async (event: FormEvent) => {
    event.preventDefault();
    const key = keyDraft.trim();
    if (!key) return;
    const nextMode = await loadCatalog(key);
    if (nextMode === "live") {
      // Demo lanes from before the unlock must not read as live answers.
      setResults([]);
      setAccessKey(key);
      storeKey(key);
      setKeyDraft("");
      setKeyNote("");
    } else {
      setKeyNote("That key was not accepted. The bench stays in demo mode.");
    }
  };

  const lock = () => {
    setAccessKey("");
    storeKey("");
    setResults([]);
    void loadCatalog("");
  };

  const isDemo = mode === "demo";
  const anyConfigured = models.some((model) => model.configured);

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runCompare = async (text: string) => {
    if (!hasVisibleText(text) || selected.size === 0) return;
    setLoading(true);
    setError("");
    setResults([]);
    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        // Demo runs never carry the key, so a demo-mode click can never spend provider credit.
        headers: { "Content-Type": "application/json", ...authHeaders(isDemo ? "" : accessKey) },
        body: JSON.stringify({ prompt: text, modelIds: [...selected] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The comparison could not be completed.");
      setResults(data.results ?? []);
    } catch (compareError) {
      setError(compareError instanceof Error ? compareError.message : "The comparison could not be completed.");
    } finally {
      setLoading(false);
    }
  };

  const pickSample = () => {
    setPrompt(SAMPLE_PROMPT);
    promptRef.current?.focus();
  };

  // Demo lanes call no model, so the sample runs at once. Live runs spend provider credit and send
  // the prompt out: the sample only fills the field, and Run comparison stays the one place to confirm.
  const runSample = () => {
    if (!isDemo) {
      pickSample();
      return;
    }
    setPrompt(SAMPLE_PROMPT);
    void runCompare(SAMPLE_PROMPT);
  };

  const laneState = (model: ModelStatus): { tone: Tone; text: string } => {
    const on = selected.has(model.id);
    if (isDemo) return { tone: on ? "amber" : "grey", text: on ? "Demo, selected" : "Demo" };
    if (!model.configured) return { tone: "grey", text: STATUS_LABEL[model.status] ?? "Unavailable" };
    return { tone: on ? "green" : "grey", text: on ? "Selected" : "Available" };
  };

  const canRun = hasVisibleText(prompt) && selected.size > 0 && !loading;

  return (
    <div className="as">
      <a className="as-skip" href="#bench">Skip to the bench</a>
      <AppTop name="Model Bench" tagline="Compare AI responses" />

      <main className="as-page" id="bench" tabIndex={-1}>
        <div className="as-intro">
          <p className="as-eyebrow">One prompt, parallel answers</p>
          <h1>Compare the same thought across the stack.</h1>
          <p>A small, honest bench for seeing how configured models read one prompt. Each answer gets its own lane.</p>
          <Pill tone={isDemo ? "amber" : anyConfigured ? "green" : "grey"}>{isDemo ? "Demo mode" : anyConfigured ? "Live lanes open" : "No provider configured"}</Pill>
        </div>

        <section className="as-composer mb-panel" aria-labelledby="bench-heading">
          <h2 id="bench-heading">Set the prompt</h2>
          <label className="as-field" htmlFor="prompt">
            Prompt
            <textarea ref={promptRef} id="prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask one clear question…" rows={5} maxLength={MAX_PROMPT_CHARS} aria-describedby="prompt-count" />
          </label>
          <div className="as-composer-foot">
            <button type="button" className="as-plain" onClick={pickSample}>Use a sample</button>
            <span className="mb-count" id="prompt-count">{prompt.length} / {MAX_PROMPT_CHARS} characters</span>
          </div>

          <fieldset className="mb-lanes">
            <legend>Model lanes {models.length ? <span className="mb-count">({models.length})</span> : null}</legend>
            {models.length === 0 ? (
              <p className="mb-count">Reading the model list…</p>
            ) : (
              <ul className="as-list">
                {models.map((model) => {
                  const off = !isDemo && !model.configured;
                  const state = laneState(model);
                  return (
                    <li className="as-row as-row-step" key={model.id} data-off={off ? "true" : undefined}>
                      <label className="as-step-label">
                        <span className="as-check">
                          <input type="checkbox" checked={selected.has(model.id)} disabled={off} onChange={() => toggle(model.id)} aria-describedby={!isDemo && model.problem ? "lane-problem-" + model.id : undefined} />
                          <span />
                        </span>
                        <span className="mb-lane-text">
                          <strong>{model.label}</strong>
                          <small>{model.provider}</small>
                          {!isDemo && model.problem ? <small id={"lane-problem-" + model.id}>{model.problem}</small> : null}
                          <Pill tone={state.tone}>{state.text}</Pill>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </fieldset>

          {isDemo ? (
            <>
              <p className="mb-callout"><strong>Demo mode.</strong> Lanes return labelled sample text and no model is called. Live comparisons spend provider credit, so they need the bench access key.</p>
              <form className="mb-key" onSubmit={unlock}>
                <label className="as-field" htmlFor="access-key">
                  Bench access key
                  <input id="access-key" type="password" autoComplete="off" value={keyDraft} onChange={(event) => setKeyDraft(event.target.value)} placeholder="Paste the key to unlock live lanes" />
                </label>
                <button type="submit" className="as-plain" disabled={!keyDraft.trim()}>Unlock</button>
              </form>
              {keyNote ? <p className="mb-error" role="status">{keyNote}</p> : null}
            </>
          ) : (
            <p className="mb-count">Live lanes unlocked for this tab. <button type="button" className="as-plain" onClick={lock}>Lock bench</button></p>
          )}
          {!isDemo && !anyConfigured && models.length > 0 ? (
            <p className="mb-callout"><strong>No provider is configured.</strong> Set a provider key and its model id (for example <code>ANTHROPIC_API_KEY</code> + <code>ANTHROPIC_MODEL_ID</code>) on the deployment to enable live comparison. Until then no lane calls a model.</p>
          ) : null}
          {error ? <p className="mb-error" role="alert">{error}</p> : null}
          {isDemo ? null : (
            <p className="mb-count" id="run-note">Run comparison sends this prompt to the provider of each selected lane and spends provider credit.</p>
          )}
          <button className="as-button mb-run" type="button" onClick={() => void runCompare(prompt)} disabled={!canRun} aria-describedby={isDemo ? undefined : "run-note"}>
            {loading ? "Reading lanes…" : "Run comparison"}
          </button>
        </section>

        <section className="mb-results" aria-labelledby="readout-heading" aria-busy={loading}>
          <div className="as-section-head">
            <h2 className="as-section-title" id="readout-heading">Answers</h2>
            <span className="mb-count" aria-live="polite">{loading ? "Reading lanes…" : results.length ? results.length + " returned" : "None yet"}</span>
          </div>
          {results.length === 0 ? (
            <div className="as-list as-empty mb-empty">
              <strong>No answers yet</strong>
              <p>Run a comparison and each selected model’s answer appears here in its own lane, with its response time.{isDemo ? " In demo mode the lanes say plainly that no model was called." : ""}</p>
              <div className="mb-example" aria-hidden="true"><b>Example lane</b>Provider · model id, then the answer text and how long it took.</div>
              <button type="button" className="as-plain" onClick={runSample} disabled={selected.size === 0 || loading}>{isDemo ? "Try the sample prompt" : "Use the sample prompt"}</button>
            </div>
          ) : (
            <ul className="as-list">
              {results.map((result) => {
                const tag = resultTag(result);
                return (
                  <li className="as-row mb-answer" key={result.modelId}>
                    <header><h3>{result.label}</h3><Pill tone={tag.tone}>{tag.text}</Pill></header>
                    {result.error ? <p data-error="true">{result.error}</p> : <p>{result.text || "No text returned."}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="as-note">Model comparison is a reading aid, not a benchmark claim. Provider keys stay on the server; a live run sends your prompt to each selected model’s provider and shows its answer here. Demo runs call no model.</p>
      </main>
      <AppFoot source={SOURCE} />
    </div>
  );
}
