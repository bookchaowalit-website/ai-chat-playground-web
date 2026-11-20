// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const $ = <T extends Element = HTMLElement>(selector: string) => host.querySelector(selector) as T | null;
const button = (text: string) => [...host.querySelectorAll("button")].find((b) => b.textContent?.trim().startsWith(text)) as HTMLButtonElement;
const flush = () => act(async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); });
const press = async (el: Element) => { await act(async () => { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); }); await flush(); };
function type(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

const demoModels = [
  { id: "openai", label: "OpenAI", provider: "openai", configured: false, status: "missing-model", problem: "Set OPENAI_MODEL_ID." },
  { id: "anthropic", label: "Anthropic · claude-x", provider: "anthropic", configured: true, status: "ready", problem: null },
];
const json = (body: unknown, ok = true) => Promise.resolve({ ok, json: () => Promise.resolve(body) });

let fetchMock: ReturnType<typeof vi.fn>;
async function mount(handler: (url: string, init?: RequestInit) => unknown) {
  fetchMock = vi.fn((url: string, init?: RequestInit) => handler(url, init));
  vi.stubGlobal("fetch", fetchMock);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<Home />));
  await flush();
}

beforeEach(() => sessionStorage.clear());
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe("demo bench", () => {
  it("arms every lane, keeps Run disabled without a prompt and shows labelled demo answers", async () => {
    await mount((url, init) => (init?.method === "POST"
      ? json({ mode: "demo", results: [{ modelId: "openai", label: "OpenAI", configured: false, demo: true, text: "Demo lane: no OpenAI model was called." }] })
      : json({ mode: "demo", models: demoModels })));
    expect(host.querySelectorAll<HTMLInputElement>(".as-check input:checked")).toHaveLength(2);
    expect(button("Run comparison").disabled).toBe(true);
    await press(button("Use a sample"));
    expect($<HTMLTextAreaElement>("#prompt")!.value).toContain("calm developer tool");
    expect(document.activeElement).toBe($("#prompt"));
    await press(button("Run comparison"));
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.modelIds).toEqual(["openai", "anthropic"]);
    expect(host.textContent).toContain("Demo, no model called");
    expect(host.textContent).toContain("1 returned");
  });

  it("runs the sample from the empty state and toggles lanes off", async () => {
    await mount((url, init) => (init?.method === "POST" ? json({ error: "Too many requests." }, false) : json({ mode: "demo", models: demoModels })));
    const first = host.querySelector<HTMLInputElement>(".as-check input")!;
    await press(first);
    expect(first.checked).toBe(false);
    await press(button("Try the sample prompt"));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).modelIds).toEqual(["anthropic"]);
    expect($("[role=alert]")!.textContent).toBe("Too many requests.");
  });

  it("keeps demo mode when the key is refused and reports a broken catalogue", async () => {
    await mount(() => json({ mode: "demo", models: demoModels }));
    type($<HTMLInputElement>("#access-key")!, "wrong-key");
    await act(async () => { $("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    await flush();
    expect(host.textContent).toContain("That key was not accepted.");
  });
});

describe("live bench", () => {
  it("unlocks with a key, disables unconfigured lanes, shows timings and errors, then locks", async () => {
    await mount((url, init) => {
      const auth = (init?.headers as Record<string, string> | undefined)?.Authorization;
      if (init?.method === "POST") return json({ mode: "live", results: [
        { modelId: "anthropic", label: "Anthropic · claude-x", configured: true, text: "An answer", ms: 812 },
        { modelId: "openai", label: "OpenAI", configured: false, error: "Set OPENAI_MODEL_ID." },
      ] });
      return json({ mode: auth ? "live" : "demo", models: demoModels });
    });
    type($<HTMLInputElement>("#access-key")!, "a-good-bench-key");
    await act(async () => { $("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    await flush();
    expect(host.textContent).toContain("Live lanes open");
    expect(sessionStorage.getItem("model-bench-access-key")).toBe("a-good-bench-key");
    const inputs = host.querySelectorAll<HTMLInputElement>(".as-check input");
    expect(inputs[0].disabled).toBe(true);
    expect(host.textContent).toContain("Needs model id");
    type($<HTMLTextAreaElement>("#prompt")!, "Hello");
    await press(button("Run comparison"));
    expect(fetchMock.mock.calls.at(-1)![1].headers.Authorization).toBe("Bearer a-good-bench-key");
    expect(host.textContent).toContain("812 ms");
    expect(host.querySelector("[data-error=true]")!.textContent).toBe("Set OPENAI_MODEL_ID.");
    await press(button("Lock bench"));
    expect(sessionStorage.getItem("model-bench-access-key")).toBeNull();
    expect(host.textContent).toContain("Demo mode");
  });

  it("fills the sample prompt without sending it, and says Live sends the prompt to the provider", async () => {
    sessionStorage.setItem("model-bench-access-key", "stored");
    await mount(() => json({ mode: "live", models: demoModels }));
    const calls = fetchMock.mock.calls.length;
    await press(button("Use the sample prompt"));
    expect(fetchMock.mock.calls.length).toBe(calls);
    expect(fetchMock.mock.calls.some((call) => call[1]?.method === "POST")).toBe(false);
    expect($<HTMLTextAreaElement>("#prompt")!.value).toContain("calm developer tool");
    expect(document.activeElement).toBe($("#prompt"));
    expect($("#run-note")!.textContent).toContain("sends this prompt to the provider of each selected lane");
    expect(button("Run comparison").getAttribute("aria-describedby")).toBe("run-note");
    expect(host.textContent).not.toContain("Keys and responses stay inside this deployment");
    expect(host.textContent).toContain("a live run sends your prompt to each selected model’s provider");
  });

  it("never sends a held key with a demo-mode run", async () => {
    sessionStorage.setItem("model-bench-access-key", "stale-key");
    await mount((url, init) => (init?.method === "POST"
      ? json({ mode: "demo", results: [] })
      : json({ mode: "demo", models: demoModels })));
    expect(host.textContent).toContain("Demo mode");
    await press(button("Try the sample prompt"));
    const post = fetchMock.mock.calls.find((call) => call[1]?.method === "POST")!;
    expect(post[1].headers.Authorization).toBeUndefined();
  });

  it("ignores a slow keyless catalogue that lands after a successful unlock", async () => {
    let releaseFirst!: () => void;
    let first = true;
    await mount((url, init) => {
      const auth = (init?.headers as Record<string, string> | undefined)?.Authorization;
      if (init?.method === "POST") return json({ mode: "live", results: [] });
      if (first && !auth) {
        first = false;
        return new Promise((resolve) => { releaseFirst = () => resolve({ ok: true, json: () => Promise.resolve({ mode: "demo", models: demoModels }) }); });
      }
      return json({ mode: auth ? "live" : "demo", models: demoModels });
    });
    type($<HTMLInputElement>("#access-key")!, "a-good-bench-key");
    await act(async () => { $("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    await flush();
    expect(host.textContent).toContain("Live lanes open");
    await act(async () => { releaseFirst(); });
    await flush();
    expect(host.textContent).toContain("Live lanes open");
    expect(host.textContent).not.toContain("Demo mode.");
  });

  it("drops a superseded unlock result so Lock bench stays locked", async () => {
    const pending: (() => void)[] = [];
    let keyed = 0;
    await mount((url, init) => {
      const auth = (init?.headers as Record<string, string> | undefined)?.Authorization;
      if (!auth) return json({ mode: "demo", models: demoModels });
      keyed += 1;
      const live = { ok: true, json: () => Promise.resolve({ mode: "live", models: demoModels }) };
      // The first keyed request hangs; later ones answer at once.
      return keyed === 1 ? new Promise((resolve) => pending.push(() => resolve(live))) : Promise.resolve(live);
    });
    const submitKey = async () => {
      type($<HTMLInputElement>("#access-key")!, "a-good-bench-key");
      await act(async () => { $("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
      await flush();
    };
    await submitKey();
    await submitKey();
    expect(host.textContent).toContain("Live lanes open");
    await press(button("Lock bench"));
    expect(sessionStorage.getItem("model-bench-access-key")).toBeNull();
    await act(async () => { pending[0](); });
    await flush();
    expect(sessionStorage.getItem("model-bench-access-key")).toBeNull();
    expect(host.textContent).toContain("Demo mode.");
    expect(host.textContent).not.toContain("That key was not accepted.");
  });

  it("says when no provider is configured and when the catalogue cannot be read", async () => {
    sessionStorage.setItem("model-bench-access-key", "stored");
    await mount(() => json({ mode: "live", models: [{ ...demoModels[0] }] }));
    expect(host.textContent).toContain("No provider is configured.");
    act(() => root.unmount());
    host.remove();
    await mount(() => Promise.reject(new Error("offline")));
    expect($("[role=alert]")!.textContent).toContain("could not be read");
  });
});
