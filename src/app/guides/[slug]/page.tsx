import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton, StepCheck } from "@/components/client";
import { EvidenceBadge, EvidenceLegend, evidenceStats } from "@/components/Evidence";
import { Generator } from "@/components/Generator";
import { DifficultyMeter, OriginBadge, Section } from "@/components/ui";
import { getGuide } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = await getGuide((await params).slug);
  return g ? { title: `${g.name} OAuth app setup · OAuth Readiness`, description: g.summary } : {};
}

const OWNER = {
  agent: { label: "Agent can do", cls: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-800", icon: "🤖" },
  you: { label: "You", cls: "bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700", icon: "👤" },
  provider: { label: "Provider / waiting", cls: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:ring-orange-800", icon: "⏳" },
};

const TIER = {
  basic: "No review",
  review: "Needs review",
  restricted: "Restricted",
  paid: "Paid",
};

export default async function GuidePage({ params }: Props) {
  const g = await getGuide((await params).slug);
  if (!g) notFound();
  const stats = evidenceStats(g);
  const owners = { agent: 0, you: 0, provider: 0 };
  g.steps.forEach((s) => owners[s.owner]++);
  const card = "rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900";

  return (
    <article>
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white">← Library</Link>

      <header className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{g.name}</h1>
            <OriginBadge origin={g.origin} />
          </div>
          <div className="mt-1 text-sm text-zinc-500">
            {g.category} · {g.website} · updated {g.updatedAt.slice(0, 10)}
            {g.model && <> · {g.model}</>}
          </div>
        </div>
        <div className="flex gap-2">
          <CopyButton text={`/guides/${g.slug}`} label="Copy share link" />
          <a href={`/api/guides/${g.slug}/markdown`} className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
            Download .md
          </a>
        </div>
      </header>

      <p className="mt-4 max-w-3xl text-lg text-zinc-700 dark:text-zinc-300">{g.summary}</p>

      {/* At a glance */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className={card}>
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Difficulty</div>
          <div className="mt-2"><DifficultyMeter score={g.difficulty.score} label={g.difficulty.label} /></div>
          <div className="mt-2 text-xs text-zinc-500">{g.difficulty.why}</div>
        </div>
        <div className={card}>
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Your hands-on time</div>
          <div className="mt-1 font-semibold">{g.time.activeEffort}</div>
        </div>
        <div className={card}>
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Waiting on approval</div>
          <div className="mt-1 font-semibold">{g.time.approvalWait}</div>
          <div className="mt-2"><EvidenceBadge e={g.time.evidence} sources={g.sources} /></div>
        </div>
        <div className={card}>
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Can you start today?</div>
          <div className={`mt-1 font-semibold ${g.quickStart.canStartToday ? "text-emerald-600" : "text-red-600"}`}>{g.quickStart.canStartToday ? "Yes" : "No"}</div>
          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{g.quickStart.detail}</div>
          <div className="mt-2"><EvidenceBadge e={g.quickStart.evidence} sources={g.sources} /></div>
        </div>
      </div>

      {/* Stages */}
      {g.stages.length > 0 && (
        <Section title="From “works for me” to “works for everyone”">
          <ol className="grid gap-3 md:grid-flow-col md:auto-cols-fr">
            {g.stages.map((s, i) => (
              <li key={i} className={`${card} relative`}>
                <div className="text-xs font-semibold text-indigo-600">Stage {i + 1}</div>
                <div className="font-semibold">{s.name}</div>
                <div className="mt-1 text-sm"><span className="text-zinc-500">Who: </span>{s.audience}</div>
                <div className="mt-1 text-sm"><span className="text-zinc-500">Unlocked by: </span>{s.unlockedBy}</div>
                <div className="mt-2"><EvidenceBadge e={s.evidence} sources={g.sources} /></div>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Steps */}
      <Section title="Steps">
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          {(Object.keys(OWNER) as (keyof typeof OWNER)[]).map((k) => (
            <span key={k} className={`rounded-full px-2 py-0.5 ring-1 ring-inset ${OWNER[k].cls}`}>
              {OWNER[k].icon} {OWNER[k].label}: {owners[k]}
            </span>
          ))}
        </div>
        <ol className="space-y-2">
          {g.steps.map((s, i) => (
            <li key={i} className={`${card} flex gap-3`}>
              <StepCheck id={`step:${g.slug}:${i}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{i + 1}. {s.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ring-1 ring-inset ${OWNER[s.owner].cls}`}>{OWNER[s.owner].icon} {OWNER[s.owner].label}</span>
                  {s.eta && <span className="text-xs text-zinc-500">{s.eta}</span>}
                </div>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 break-words">{s.detail}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <EvidenceBadge e={s.evidence} sources={g.sources} />
                  {s.link && <a href={s.link} target="_blank" rel="noreferrer" className="text-xs text-sky-700 hover:underline dark:text-sky-400">Open ↗</a>}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {g.composio && (
        <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/40">
          <div className="text-sm font-semibold">Composio redirect URI</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="break-all rounded bg-white px-2 py-1 font-mono text-sm dark:bg-zinc-900">{g.composio.redirectUri}</code>
            <CopyButton text={g.composio.redirectUri} />
          </div>
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">{g.composio.note}</p>
        </div>
      )}

      <div className="grid gap-x-8 md:grid-cols-2">
        <Section title="Requirements">
          <ul className="space-y-2">
            {g.requirements.map((r, i) => (
              <li key={i} className={card}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.item}</span>
                  <span className={`text-[11px] font-medium ${r.when === "always" ? "text-red-600" : "text-zinc-500"}`}>{r.when === "always" ? "Required" : "Depends on scope/stage"}</span>
                </div>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{r.detail}</p>
                <div className="mt-2"><EvidenceBadge e={r.evidence} sources={g.sources} /></div>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Likely blockers & what to do">
          <ul className="space-y-2">
            {g.blockers.map((b, i) => (
              <li key={i} className={card}>
                <div className="font-medium">⚠ {b.issue}</div>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400"><b className="text-zinc-800 dark:text-zinc-200">Fix:</b> {b.workaround}</p>
                <div className="mt-2"><EvidenceBadge e={b.evidence} sources={g.sources} /></div>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {g.scopes.length > 0 && (
        <Section title="Scopes and what they trigger">
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900">
                <tr><th className="px-3 py-2">Scope</th><th className="px-3 py-2">Tier</th><th className="px-3 py-2">Note</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                {g.scopes.map((s, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-mono text-xs">{s.name}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{TIER[s.tier]}</td>
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{s.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <Section title="How sure are we?" id="evidence">
        <div className={card}>
          <div className="flex flex-wrap gap-4 text-sm">
            <span><b className="text-emerald-600">{stats.tested}</b> tested</span>
            <span><b className="text-sky-600">{stats.sourced}</b> sourced</span>
            <span><b className="text-amber-600">{stats.inferred}</b> unverified</span>
            <span className="text-zinc-500">of {stats.total} claims</span>
          </div>
          <div className="mt-2"><EvidenceLegend /></div>
          {g.uncertainties.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-semibold">Open questions</div>
              <ul className="mt-1 list-disc pl-5 text-sm text-zinc-600 dark:text-zinc-400">
                {g.uncertainties.map((u, i) => <li key={i}>{u}</li>)}
              </ul>
            </div>
          )}
          {g.verification.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-semibold">Verification log</div>
              <ul className="mt-1 space-y-1 text-sm">
                {g.verification.map((v, i) => (
                  <li key={i} className="flex gap-2">
                    <span className={v.outcome === "confirmed" ? "text-emerald-600" : v.outcome === "corrected" ? "text-sky-600" : "text-amber-600"}>
                      {v.outcome === "confirmed" ? "✓" : v.outcome === "corrected" ? "✎" : "?"}
                    </span>
                    <span><span className="text-zinc-500">{v.date} · {v.method}:</span> {v.finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <ol className="mt-4 space-y-1 text-sm">
          {g.sources.map((s, i) => (
            <li key={s.id} id={`src-${s.id}`} className="scroll-mt-6">
              <span className="text-zinc-500">[{i + 1}]</span>{" "}
              <a href={s.url} target="_blank" rel="noreferrer" className="text-sky-700 hover:underline dark:text-sky-400 break-words">{s.title}</a>{" "}
              <span className="text-xs text-zinc-500">({s.kind})</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Out of date?">
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">Run the research agent again to fetch the provider&apos;s current docs.</p>
        <div className="max-w-md"><Generator initial={g.website || g.name} fresh compact /></div>
      </Section>
    </article>
  );
}
