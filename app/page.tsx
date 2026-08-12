"use client";

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

export default function Home() {
  const [models, setModels] = useState<ModelStatus[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [prompt, setPrompt] = useState("");
  const [results, setResults] = useState<CompareResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/compare")
      .then((r) => r.json())
      .then((data: { models: ModelStatus[] }) => {
        setModels(data.models);
        setSelected(new Set(data.models.filter((m) => m.configured).map((m) => m.id)));
      })
      .catch(() => setModels([]));
  }, []);

  const anyConfigured = models.some((m) => m.configured);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCompare = async () => {
    if (!prompt.trim() || selected.size === 0) return;
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, modelIds: [...selected] }),
      });
      const data = await res.json();
      setResults(data.results ?? []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Chat Playground</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Send one prompt to multiple models at once and compare the responses side by side.
          </p>
        </header>

        {!anyConfigured && models.length > 0 && (
          <div className="mb-6 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 text-sm text-amber-900 dark:text-amber-200">
            No AI provider is configured yet. Add <code className="font-mono">OPENAI_API_KEY</code>,{" "}
            <code className="font-mono">ANTHROPIC_API_KEY</code>, or{" "}
            <code className="font-mono">GOOGLE_GENERATIVE_AI_API_KEY</code> as an environment variable on this
            deployment to enable live comparison. The UI below is fully wired — it just needs a key.
          </div>
        )}

        <section className="mb-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500 mb-2">
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Ask something and see how each model answers it…"
            className="w-full resize-none rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {models.map((m) => (
              <label
                key={m.id}
                className={`inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm cursor-pointer ${
                  !m.configured
                    ? "opacity-50 cursor-not-allowed border-zinc-200 dark:border-zinc-800"
                    : selected.has(m.id)
                    ? "border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-800"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(m.id)}
                  disabled={!m.configured}
                  onChange={() => toggle(m.id)}
                  className="sr-only"
                />
                {m.label}
                {!m.configured && <span className="text-xs text-zinc-500">(no key)</span>}
              </label>
            ))}
          </div>

          <button
            onClick={handleCompare}
            disabled={!prompt.trim() || selected.size === 0 || loading}
            className="mt-3 rounded bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Comparing…" : "Compare"}
          </button>
        </section>

        {results.length > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((r) => (
              <div key={r.modelId} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">{r.label}</h2>
                  {r.ms !== undefined && <span className="text-xs text-zinc-500">{r.ms}ms</span>}
                </div>
                {r.error ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{r.error}</p>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.text}</p>
                )}
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
