import type { Evidence as Ev, Guide } from "@/lib/schema";

const STYLE = {
  tested: { label: "Tested", icon: "✓", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800" },
  sourced: { label: "Sourced", icon: "◆", cls: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-800" },
  inferred: { label: "Unverified", icon: "?", cls: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800" },
};

export function EvidenceBadge({ e, sources }: { e: Ev; sources: Guide["sources"] }) {
  const s = STYLE[e.level];
  const idx = (id: string) => sources.findIndex((x) => x.id === id) + 1;
  const tip = [e.quote && `“${e.quote}”`, e.note].filter(Boolean).join(" — ");
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap ${s.cls}`} title={tip || undefined}>
      <span aria-hidden>{s.icon}</span>
      {s.label}
      {e.sourceIds
        .filter((id) => idx(id) > 0)
        .map((id) => (
          <a key={id} href={`#src-${id}`} className="underline decoration-dotted hover:decoration-solid">
            [{idx(id)}]
          </a>
        ))}
    </span>
  );
}

export function EvidenceLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
      <span><b className="text-emerald-600">✓ Tested</b>: done or observed live</span>
      <span><b className="text-sky-600">◆ Sourced</b>: stated in a linked document</span>
      <span><b className="text-amber-600">? Unverified</b>: reasoning or general knowledge; double-check</span>
    </div>
  );
}

export function evidenceStats(g: Guide) {
  const all: Ev[] = [];
  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      for (const [k, val] of Object.entries(v)) {
        if (k === "evidence") all.push(val as Ev);
        else walk(val);
      }
    }
  };
  walk(g);
  return {
    total: all.length,
    tested: all.filter((e) => e.level === "tested").length,
    sourced: all.filter((e) => e.level === "sourced").length,
    inferred: all.filter((e) => e.level === "inferred").length,
  };
}
