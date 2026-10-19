import Link from "next/link";
import type { Guide } from "@/lib/schema";

export function difficultyColor(score: number) {
  if (score <= 1) return "bg-emerald-500";
  if (score <= 2) return "bg-lime-500";
  if (score <= 3) return "bg-amber-500";
  if (score <= 4) return "bg-orange-500";
  return "bg-red-500";
}

export function DifficultyMeter({ score, label }: { score: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5" aria-label={`Difficulty ${score} of 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`h-2 w-4 rounded-sm ${i <= score ? difficultyColor(score) : "bg-zinc-200 dark:bg-zinc-700"}`} />
        ))}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export function OriginBadge({ origin }: { origin: Guide["origin"] }) {
  return origin === "curated" ? (
    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:ring-indigo-800">
      Curated
    </span>
  ) : (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700">
      Agent-generated
    </span>
  );
}

export function GuideCard({ g }: { g: Guide }) {
  return (
    <Link
      href={`/guides/${g.slug}`}
      className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-700"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold group-hover:text-indigo-600">{g.name}</div>
          <div className="text-xs text-zinc-500">{g.category}</div>
        </div>
        <OriginBadge origin={g.origin} />
      </div>
      <div className="mt-3">
        <DifficultyMeter score={g.difficulty.score} label={g.difficulty.label} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-zinc-500">Hands-on</dt>
          <dd className="font-medium">{g.time.activeEffort.split("·")[0]}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Approval wait</dt>
          <dd className="font-medium">{g.time.approvalWait.split("·")[0]}</dd>
        </div>
      </dl>
      <p className="mt-3 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">{g.summary}</p>
    </Link>
  );
}

export function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="mt-8 scroll-mt-6">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
