"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AgentEvent } from "@/lib/agent";

export function Generator({ initial = "", fresh = false, compact = false }: { initial?: string; fresh?: boolean; compact?: boolean }) {
  const router = useRouter();
  const [app, setApp] = useState(initial);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    if (!app.trim() || running) return;
    setRunning(true);
    setError(null);
    setEvents([]);
    try {
      const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ app, fresh }) });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line) as AgentEvent;
          setEvents((x) => [...x, ev]);
          if (ev.type === "done") {
            try {
              if (ev.guide) sessionStorage.setItem(`guide:${ev.slug}`, JSON.stringify(ev.guide));
            } catch {}
            router.push(`/guides/${ev.slug}`);
            router.refresh();
          }
          if (ev.type === "error") setError(ev.message);
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  }

  const steps = events.filter((e) => e.type === "step");
  const sources = events.filter((e): e is Extract<AgentEvent, { type: "source" }> => e.type === "source");

  return (
    <div>
      <form onSubmit={run} className="flex flex-col gap-2 sm:flex-row">
        {!compact && (
          <input
            value={app}
            onChange={(e) => setApp(e.target.value)}
            placeholder="App name or website, e.g. Calendly, airtable.com, Zoom"
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-indigo-900"
          />
        )}
        <button
          disabled={running || !app.trim()}
          className="rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
        >
          {running ? "Agent working…" : compact ? "Regenerate with agent" : "Generate guide"}
        </button>
      </form>

      {(events.length > 0 || error) && (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <ol className="space-y-2">
            {steps.map((s, i) => {
              const last = i === steps.length - 1 && running;
              return (
                <li key={i} className="flex gap-2">
                  <span className={last ? "animate-pulse text-indigo-600" : "text-emerald-600"}>{last ? "●" : "✓"}</span>
                  <div>
                    <div className="font-medium">{s.type === "step" && s.label}</div>
                    {s.type === "step" && s.detail && <div className="text-xs text-zinc-500 break-words">{s.detail}</div>}
                  </div>
                </li>
              );
            })}
          </ol>
          {sources.length > 0 && (
            <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Sources read</div>
              <ul className="space-y-0.5 text-xs">
                {sources.map((s) => (
                  <li key={s.url} className="truncate">
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-sky-700 hover:underline dark:text-sky-400">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {error && <div className="mt-3 rounded bg-red-50 p-2 text-red-700 dark:bg-red-950 dark:text-red-300">Error: {error}</div>}
        </div>
      )}
    </div>
  );
}
