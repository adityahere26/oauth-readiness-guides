import type { Evidence, Guide } from "@/lib/schema";
import { getGuide } from "@/lib/store";

const OWNER = { agent: "🤖 Agent", you: "👤 You", provider: "⏳ Provider" };

function ev(e: Evidence, g: Guide) {
  if (e.level === "inferred") return " _(unverified)_";
  const refs = e.sourceIds.map((id) => `[${g.sources.findIndex((s) => s.id === id) + 1}]`).join("");
  return e.level === "tested" ? ` _(tested${refs})_` : ` _(source ${refs})_`;
}

function toMarkdown(g: Guide) {
  const L: string[] = [];
  L.push(`# ${g.name}: OAuth app setup & approval`, "", `> ${g.summary}`, "");
  L.push(`| | |`, `|---|---|`);
  L.push(`| Difficulty | ${g.difficulty.score}/5 · ${g.difficulty.label} (${g.difficulty.why}) |`);
  L.push(`| Hands-on time | ${g.time.activeEffort} |`);
  L.push(`| Approval wait | ${g.time.approvalWait}${ev(g.time.evidence, g)} |`);
  L.push(`| Start today? | ${g.quickStart.canStartToday ? "Yes" : "No"}: ${g.quickStart.detail} |`, "");
  if (g.stages.length) {
    L.push(`## Stages`);
    g.stages.forEach((s, i) => L.push(`${i + 1}. **${s.name}**: ${s.audience}. Unlocked by: ${s.unlockedBy}${ev(s.evidence, g)}`));
    L.push("");
  }
  L.push(`## Steps`);
  g.steps.forEach((s) => L.push(`- [ ] **${s.title}** (${OWNER[s.owner]}${s.eta ? `, ${s.eta}` : ""}): ${s.detail}${s.link ? ` ${s.link}` : ""}${ev(s.evidence, g)}`));
  if (g.composio) L.push("", `**Composio redirect URI:** \`${g.composio.redirectUri}\`. ${g.composio.note}`);
  L.push("", `## Requirements`);
  g.requirements.forEach((r) => L.push(`- **${r.item}** (${r.when === "always" ? "required" : "conditional"}): ${r.detail}${ev(r.evidence, g)}`));
  L.push("", `## Blockers`);
  g.blockers.forEach((b) => L.push(`- **${b.issue}**: ${b.workaround}${ev(b.evidence, g)}`));
  if (g.scopes.length) {
    L.push("", `## Scopes`, `| Scope | Tier | Note |`, `|---|---|---|`);
    g.scopes.forEach((s) => L.push(`| \`${s.name}\` | ${s.tier} | ${s.note} |`));
  }
  if (g.uncertainties.length) L.push("", `## Open questions`, ...g.uncertainties.map((u) => `- ${u}`));
  L.push("", `## Sources`, ...g.sources.map((s, i) => `${i + 1}. [${s.title}](${s.url}) (${s.kind})`));
  L.push("", `_${g.origin === "curated" ? "Curated" : `Agent-generated (${g.model})`} · updated ${g.updatedAt.slice(0, 10)}_`);
  return L.join("\n");
}

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const g = await getGuide((await params).slug);
  if (!g) return new Response("Not found", { status: 404 });
  return new Response(toMarkdown(g), {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="${g.slug}-oauth-guide.md"` },
  });
}
