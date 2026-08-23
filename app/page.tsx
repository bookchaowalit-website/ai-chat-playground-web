"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface ModelStatus {
  id: string;
  label: string;
  provider: string;
  configured: boolean;
}

interface CompareResult {
  modelId: string;
  label: string;
  configured: boolean;
  text?: string;
  error?: string;
  ms?: number;
}

const SAMPLE_PROMPT = "Explain one trade-off in designing a calm developer tool.";

export default function Home() {
  const [models, setModels] = useState<ModelStatus[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [prompt, setPrompt] = useState("");
  const [results, setResults] = useState<CompareResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/compare")
      .then((response) => response.json())
      .then((data: { models: ModelStatus[] }) => {
        setModels(data.models);
        setSelected(new Set(data.models.filter((model) => model.configured).map((model) => model.id)));
      })
      .catch(() => setError("The model catalogue could not be read. Refresh to try again."));
  }, []);

  const anyConfigured = models.some((model) => model.configured);

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCompare = async () => {
    if (!prompt.trim() || selected.size === 0) return;
    setLoading(true);
    setError("");
    setResults([]);
    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, modelIds: [...selected] }),
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

  return (
    <main className="signal-room">
      <span className="contract-mark" dangerouslySetInnerHTML={{ __html: "<!-- THESIS: one prompt, many model signals; FINISH: response lanes, provider states, no generic cards -->" }} />
      <div className="signal-shell">
        <header className="signal-topbar">
          <Link className="signal-wordmark" href="/">MODEL / BENCH</Link>
          <span className="signal-status"><i aria-hidden="true" /> {anyConfigured ? "Provider line open" : "Local comparison bench"}</span>
        </header>

        <section className="signal-intro">
          <div>
            <p className="signal-overline">one prompt / parallel readout</p>
            <h1>Compare the same thought across the stack.</h1>
          </div>
          <p className="signal-deck">A small, honest bench for seeing how configured models interpret one prompt. The prompt stays here; each response gets its own lane.</p>
        </section>

        <section className="bench" aria-labelledby="bench-heading">
          <div className="bench-heading-row">
            <div>
              <span className="section-index">01</span>
              <h2 id="bench-heading">Set the transmission</h2>
            </div>
            <span className="bench-note">{models.length ? models.length + " model channels" : "Reading channel list…"}</span>
          </div>
          <label className="prompt-field" htmlFor="prompt">
            <span>Prompt</span>
            <textarea id="prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask one clear question…" rows={5} />
          </label>
          <div className="prompt-tools">
            <button type="button" className="text-button" onClick={() => setPrompt(SAMPLE_PROMPT)}>Use a sample</button>
            <span className="prompt-count">{prompt.length} characters</span>
          </div>

          <div className="channel-list" role="group" aria-label="Model channels">
            {models.map((model, index) => (
              <label className={"channel-row " + (selected.has(model.id) ? "is-selected " : "") + (!model.configured ? "is-muted" : "")} key={model.id}>
                <input type="checkbox" checked={selected.has(model.id)} disabled={!model.configured} onChange={() => toggle(model.id)} />
                <span className="channel-number">0{index + 1}</span>
                <span className="channel-name">{model.label}</span>
                <span className="channel-provider">{model.provider}</span>
                <span className="channel-state">{model.configured ? (selected.has(model.id) ? "armed" : "available") : "needs key"}</span>
              </label>
            ))}
          </div>

          {!anyConfigured && models.length > 0 && (
            <p className="bench-warning"><strong>No provider is patched in.</strong> Add a provider key to the deployment to enable live comparison. The bench remains usable as a product surface without pretending it has a live model.</p>
          )}
          {error && <p className="bench-error" role="alert">{error}</p>}
          <button className="fire-button" type="button" onClick={handleCompare} disabled={!prompt.trim() || selected.size === 0 || loading}>
            {loading ? "Reading channels…" : "Run comparison"}
          </button>
        </section>

        <section className="readout" aria-labelledby="readout-heading">
          <div className="bench-heading-row">
            <div>
              <span className="section-index">02</span>
              <h2 id="readout-heading">Read the response lanes</h2>
            </div>
            <span className="bench-note">{results.length ? results.length + " returned" : "Waiting for a transmission"}</span>
          </div>
          {results.length === 0 ? (
            <div className="empty-readout"><span className="empty-line" /> <p>Run a comparison to place each model’s answer on the same bench.</p></div>
          ) : (
            <div className="lane-grid">
              {results.map((result) => (
                <article className={"response-lane " + (result.error ? "has-error" : "")} key={result.modelId}>
                  <header><span>{result.label}</span><span>{result.ms !== undefined ? result.ms + "ms" : "not armed"}</span></header>
                  <div className="lane-rule" />
                  {result.error ? <p className="lane-error">{result.error}</p> : <p>{result.text || "No text returned."}</p>}
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="signal-footer">Model comparison is a reading aid, not a benchmark claim. Keys and responses belong to the deployment boundary.</footer>
      </div>
    </main>
  );
}
