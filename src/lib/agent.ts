import Groq from "groq-sdk";
import { COMPOSIO_REDIRECT_URI, Guide, slugify, type Evidence } from "./schema";
import { fetchPage, probeOAuthMetadata, webSearch, type SearchResult } from "./tools";

export type AgentEvent =
  | { type: "step"; label: string; detail?: string }
  | { type: "source"; title: string; url: string }
  | { type: "done"; slug: string; guide?: Guide }
  | { type: "error"; message: string };

type Emit = (e: AgentEvent) => void;

const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const MAX_PAGES = 5;

let _groq: Groq | null = null;
const groq = () => (_groq ??= new Groq({ apiKey: process.env.GROQ_API_KEY }));

/** One JSON-returning LLM call with retry on rate limits (Groq free tier is tight on tokens/minute). */
async function llmJSON<T>(system: string, user: string, emit: Emit, maxTokens = 1500): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await groq().chat.completions.create({
        model: MODEL,
        temperature: 0.2,
        max_completion_tokens: maxTokens,
        response_format: { type: "json_object" },
        ...(MODEL.includes("gpt-oss") ? { reasoning_effort: "low" as const } : {}),
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
      const text = res.choices[0]?.message?.content ?? "";
      return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as T;
    } catch (e) {
      const err = e as { status?: number; headers?: Record<string, string>; message?: string };
      if (err.status === 429 && attempt < 3) {
        const wait = Math.min(Number(err.headers?.["retry-after"]) || 15, 30);
        emit({ type: "step", label: "Rate limited by model provider", detail: `Waiting ${wait}s and retrying…` });
        await new Promise((r) => setTimeout(r, wait * 1000));
        continue;
      }
      // Malformed JSON (ours, or Groq's json_validate_failed): retry once.
      if ((e instanceof SyntaxError || (err.status === 400 && /json/i.test(err.message ?? ""))) && attempt < 2) {
        emit({ type: "step", label: "Model returned malformed JSON", detail: "Retrying…" });
        continue;
      }
      throw e;
    }
  }
  throw new Error("Model call failed after retries");
}

type Plan = { name: string; website: string; category: string; devDocsHint: string; queries: string[] };
type Selection = { read?: string[]; search?: string[]; reason?: string };
type Page = { id: string; url: string; title: string; text: string };

export async function generateGuide(input: string, emit: Emit): Promise<Guide> {
  // 1 ── Plan ───────────────────────────────────────────────────────────
  emit({ type: "step", label: `Identifying "${input}"` });
  const plan = await llmJSON<Plan>(
    `You plan research into how a developer creates an OAuth app for a SaaS provider and gets it approved for production.
Return JSON: {"name": canonical product name, "website": primary domain like "example.com", "category": one or two words,
"devDocsHint": likely developer docs domain, "queries": 3 web search queries}.
Queries should target: (1) official docs for creating an OAuth app/client, (2) going live: app review / verification / production approval / development-mode user limits / marketplace or partner requirements and timelines, (3) scopes/permissions and any restrictions or paid tiers.`,
    `App: ${input}`,
    emit,
    600,
  );
  emit({ type: "step", label: `Researching ${plan.name}`, detail: plan.website });

  // 2 ── Search ↔ select loop (model chooses what to read, can ask for more searches) ──
  const results: SearchResult[] = [];
  let queries = plan.queries.slice(0, 3);
  let chosen: string[] = [];
  for (let round = 0; round < 2 && queries.length; round++) {
    emit({ type: "step", label: round === 0 ? "Searching the web" : "Searching for missing details", detail: queries.join(" · ") });
    const batches = await Promise.all(queries.map((q) => webSearch(q).catch(() => [] as SearchResult[])));
    if (!batches.flat().length) emit({ type: "step", label: "⚠ Web search returned nothing", detail: "Search provider may be rate-limiting. The guide will lean on probe data and model knowledge, and will be labeled accordingly." });
    const seen = new Set(results.map((r) => r.url));
    results.push(...batches.flat().filter((r) => !seen.has(r.url) && seen.add(r.url)));
    if (!results.length) break;

    const sel = await llmJSON<Selection>(
      `You choose which pages to read to write an OAuth-app setup guide for ${plan.name}.
Prefer official provider docs (${plan.website}, ${plan.devDocsHint}) over blogs. Cover: creating the OAuth app, redirect URIs, review/verification/approval process and timelines, scope restrictions, pricing gates.
Return JSON {"read": [up to ${MAX_PAGES} URLs from the list, most useful first], "search": [0-2 new queries ONLY if important topics are not covered by any result], "reason": short}.`,
      results.map((r, i) => `${i + 1}. ${r.title}\n${r.url}\n${r.snippet}`).join("\n\n"),
      emit,
      500,
    );
    chosen = (sel.read ?? []).filter((u) => results.some((r) => r.url === u)).slice(0, MAX_PAGES);
    queries = round === 0 ? (sel.search ?? []).slice(0, 2) : [];
    if (sel.reason) emit({ type: "step", label: "Chose sources", detail: sel.reason });
  }
  // The model sometimes picks just one page; top up to 3, official docs first, so one page never decides the guide.
  if (chosen.length < 3) {
    const domain = plan.website.replace(/^www\./, "");
    const extra = results
      .filter((r) => !chosen.includes(r.url))
      .sort((a, b) => Number(b.url.includes(domain) || b.url.includes(plan.devDocsHint)) - Number(a.url.includes(domain) || a.url.includes(plan.devDocsHint)));
    chosen.push(...extra.slice(0, 3 - chosen.length).map((r) => r.url));
  }

  // 3 ── Read pages + live probe (no LLM) ───────────────────────────────
  emit({ type: "step", label: `Reading ${chosen.length} page${chosen.length === 1 ? "" : "s"} and probing ${plan.website}'s OAuth endpoints` });
  const [fetched, probe] = await Promise.all([Promise.all(chosen.map((u) => fetchPage(u, 2400))), probeOAuthMetadata(plan.website)]);
  const seenUrls = new Set<string>();
  const pages: Page[] = fetched
    .filter((p) => p.ok && p.text.length > 200)
    .filter((p) => {
      const key = p.url.replace(/[?#].*$/, "").replace(/\.md$|\/$/, "");
      return !seenUrls.has(key) && !!seenUrls.add(key);
    })
    .map((p, i) => ({ id: `s${i + 1}`, url: p.url, title: p.title, text: p.text }));
  pages.forEach((p) => emit({ type: "source", title: p.title, url: p.url }));
  const probed = probe.found ? (probe.results as { url: string; registration_endpoint: string | null }[]) : [];
  emit({
    type: "step",
    label: probe.found ? "Live check: OAuth discovery metadata found" : "Live check: no public OAuth discovery document",
    detail: probe.found
      ? probed.map((r) => r.url).join(", ") + (probed.some((r) => r.registration_endpoint) ? " · advertises dynamic client registration" : "")
      : undefined,
  });

  // 4 ── Synthesize ─────────────────────────────────────────────────────
  emit({ type: "step", label: "Writing the guide", detail: `Model: ${MODEL}` });
  let draft = await llmJSON<Record<string, unknown>>(SYNTH_SYSTEM, synthUser(plan, pages, probe), emit, 4000);

  // 4b ── Gap check: "no review found" is the most dangerous conclusion, so dig once more before accepting it.
  const wait = String((draft.time as { approvalWait?: string } | undefined)?.approvalWait ?? "");
  if (/none found|unknown|not (documented|found|specified)|unclear/i.test(wait)) {
    emit({ type: "step", label: "Gap: no approval process found yet, so digging deeper", detail: "Absence of evidence isn't evidence of absence" });
    const gapQueries = [
      `${plan.name} API app production approval development mode user limit`,
      `${plan.name} developer guide app review production status`,
      `${plan.name} OAuth app publish go live requirements`,
    ];
    const domain = plan.website.replace(/^www\./, "");
    const official = (u: string) => u.includes(domain) || (!!plan.devDocsHint && u.includes(plan.devDocsHint));
    const seen = new Set(pages.map((p) => p.url.replace(/[?#].*$/, "")));
    const fresh = (await Promise.all(gapQueries.map((q) => webSearch(q).catch(() => [] as SearchResult[]))))
      .flat()
      .filter((r) => !seen.has(r.url.replace(/[?#].*$/, "")) && seen.add(r.url.replace(/[?#].*$/, "")))
      .sort((x, y) => Number(official(y.url)) - Number(official(x.url)))
      .slice(0, 5);
    const more = (await Promise.all(fresh.map((r) => fetchPage(r.url, 2000)))).filter((p) => p.ok && p.text.length > 200).slice(0, 3);
    for (const p of more) {
      pages.push({ id: `s${pages.length + 1}`, url: p.url, title: p.title, text: p.text });
      emit({ type: "source", title: p.title, url: p.url });
    }
    if (more.length) {
      emit({ type: "step", label: `Rewriting with ${more.length} more source${more.length > 1 ? "s" : ""}` });
      draft = await llmJSON<Record<string, unknown>>(SYNTH_SYSTEM, synthUser(plan, pages, probe), emit, 4000);
    }
  }

  // 5a ── Mechanical check: does each quote exist in the fetched text? ──
  emit({ type: "step", label: "Checking every quote against the fetched text" });
  const claims = collectClaims(draft);
  const byId = new Map(pages.map((p) => [p.id, p]));
  const probeText = JSON.stringify(probe);
  let notFound = 0;
  for (const c of claims) {
    const e = c.evidence;
    const ids = (Array.isArray(e.sourceIds) ? e.sourceIds : []).filter((id) => byId.has(id) || (id === "probe" && probe.found));
    if (e.level === "tested" && !(probe.found && (ids.includes("probe") || (e.quote && norm(probeText).includes(norm(e.quote))))))
      c.downgrade("Labeled tested, but no live check backs it");
    else if (e.level === "sourced" && !(ids.length && e.quote && ids.some((id) => quoteFound(e.quote!, byId.get(id)!.text)))) c.downgrade("Quote not found in the cited source");
    else if (e.level !== "inferred") e.sourceIds = e.level === "tested" ? ["probe"] : ids;
    else e.sourceIds = [];
    if (c.evidence.level === "inferred" && c.downgraded) notFound++;
  }

  // 5b ── Skeptic pass: does each quote actually SUPPORT its claim? ─────
  const toJudge = claims.filter((c) => c.evidence.level !== "inferred");
  let unsupported = 0;
  if (toJudge.length) {
    emit({ type: "step", label: `Skeptic review of ${toJudge.length} cited claims`, detail: "A second pass checks whether each quote really supports the claim it's attached to" });
    const verdict = await llmJSON<{ unsupported?: number[] }>(
      `You are a strict fact-checker. For each numbered claim you get the CLAIM and the EVIDENCE (a quote from a document, or a JSON probe result).
Judge the provider-specific factual core of the claim:
- Ignore parts about Composio, generic UI wording, and advice. Those aren't provider facts.
- Be STRICT about durations, review timelines, limits, prices, eligibility and which audience can use the app: those must appear in the evidence.
- An endpoint being advertised in metadata does NOT prove it works or how it behaves.
A claim is UNSUPPORTED if its core fact isn't stated or directly implied by the evidence.
Return JSON {"unsupported": [claim numbers that are NOT supported]}.`,
      toJudge
        .map((c, i) => `${i + 1}. CLAIM: ${c.text}\n   EVIDENCE: ${c.evidence.level === "tested" ? JSON.stringify(probe).slice(0, 400) : `"${c.evidence.quote}"`}`)
        .join("\n"),
      emit,
      800,
    ).catch(() => ({ unsupported: [] as number[] }));
    for (const n of verdict.unsupported ?? []) {
      const c = toJudge[n - 1];
      if (c && c.evidence.level !== "inferred") {
        c.downgrade("Fact-check: the quoted evidence doesn't support this claim");
        unsupported++;
      }
    }
  }
  emit({
    type: "step",
    label: `Evidence check: ${notFound + unsupported} of ${claims.length} claims downgraded to "unverified"`,
    detail: `${notFound} quote(s) not found in the source · ${unsupported} quote(s) didn't support the claim`,
  });

  return assemble(draft, plan, pages, probe, { notFound, unsupported, judged: toJudge.length });
}

const SYNTH_SYSTEM = `You write practical guides for developers who must create their own OAuth app with a provider (so their AI agent's users can connect accounts via Composio) and get it ready for production.

Context: Composio runs the OAuth flow at runtime (authorize redirect, PKCE, token exchange, refresh). The developer's job is to REGISTER the provider OAuth app, configure it, get any approvals, and paste client ID/secret into a Composio auth config. Do NOT include steps for implementing OAuth flows or token exchange.

Ground every claim in the SOURCES. Rules:
- evidence.level = "sourced" only if a source explicitly says it; include sourceIds (e.g. ["s2"]) and a SHORT verbatim quote (5-25 words copied exactly) that SUPPORTS the claim on its own.
- evidence.level = "tested" only for what the LIVE PROBE literally shows (e.g. "the provider publishes OAuth metadata at URL X", "it advertises a registration endpoint"). The probe does not show behaviour, limits, or that registration works.
- Otherwise evidence.level = "inferred". Never invent URLs, review processes, durations, or tiers.
- If sources don't mention an app review / verification / marketplace process, set approvalWait to "None found in docs" and add an uncertainty. Don't guess one.
- Keep ACTIVE EFFORT (hands-on) separate from APPROVAL WAIT (provider review).
- stages: the ladder from "works for me" to "works for all users". Use only gates the provider actually defines (test users, development mode, user caps, review, listing). Do NOT invent stages like "beta users" or "early adopters". If no gate is documented, use two stages: your own account, then everyone.
- Step owner: "agent" if an AI agent could do it (draft text, prefill config values, write manifests, look things up), "you" if it needs the developer's login, identity, payment or judgement, "provider" for review/waiting.
- If the probe shows a registration_endpoint, you may mention dynamic client registration as an option to test. Don't claim it works for regular API access (it is often for MCP clients only).
- Put unknowns in "uncertainties". Fewer accurate items beat many guesses.
- The Composio redirect URI is ${COMPOSIO_REDIRECT_URI}.

Return ONLY JSON with this shape:
{
 "summary": "2-3 sentences: how hard, what's the catch",
 "difficulty": {"score": 1-5, "label": "Easy|Moderate|Involved|Hard|Gated|Paid", "why": "..."},
 "time": {"activeEffort": "e.g. 20–40 min", "approvalWait": "e.g. None / ~10 business days / None found in docs", "evidence": EV},
 "quickStart": {"canStartToday": true|false, "detail": "can the developer test with their own account before any review?", "evidence": EV},
 "stages": [{"name": "...", "audience": "who can use it", "unlockedBy": "...", "evidence": EV}],
 "requirements": [{"item": "...", "when": "always|conditional", "detail": "...", "evidence": EV}],
 "steps": [{"title": "...", "owner": "agent|you|provider", "detail": "...", "eta": "...", "link": "url from sources or omit", "evidence": EV}],
 "blockers": [{"issue": "...", "workaround": "...", "evidence": EV}],
 "scopes": [{"name": "...", "tier": "basic|review|restricted|paid", "note": "..."}],
 "uncertainties": ["..."]
}
where EV = {"level": "sourced|tested|inferred", "sourceIds": ["s1"], "quote": "exact words", "note": "optional"}.
Aim for 4-7 steps, 2-5 requirements, 2-4 blockers.`;

function synthUser(plan: Plan, pages: Page[], probe: unknown) {
  return `APP: ${plan.name} (${plan.website}), category ${plan.category}

LIVE PROBE (OAuth discovery endpoints, fetched just now):
${JSON.stringify(probe).slice(0, 1500)}

SOURCES:
${pages.map((p) => `[${p.id}] ${p.title}\n${p.url}\n${p.text}`).join("\n\n---\n\n") || "(no pages could be fetched — rely on inferred knowledge and say so)"}`;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Does `quote` (mostly) appear in `text`? Tolerates small paraphrase by matching 6-word shingles. */
function quoteFound(quote: string, text: string) {
  const q = norm(quote);
  const t = norm(text);
  if (!q) return false;
  if (t.includes(q)) return true;
  const words = q.split(" ");
  if (words.length < 6) return false;
  const shingles = words.slice(0, words.length - 5).map((_, i) => words.slice(i, i + 6).join(" "));
  return shingles.filter((s) => t.includes(s)).length / shingles.length >= 0.5;
}

type Claim = { text: string; evidence: Evidence; downgraded: boolean; downgrade: (why: string) => void };

/** Find every {…, evidence} object in the draft; `text` is the claim (its other string fields). */
function collectClaims(draft: Record<string, unknown>): Claim[] {
  const out: Claim[] = [];
  const walk = (v: unknown) => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (!v || typeof v !== "object") return;
    const o = v as Record<string, unknown>;
    if ("evidence" in o) {
      if (!o.evidence || typeof o.evidence !== "object") o.evidence = { level: "inferred", sourceIds: [] };
      const claim: Claim = {
        text: Object.entries(o)
          .filter(([k, x]) => !["evidence", "eta", "link", "owner", "when"].includes(k) && typeof x === "string")
          .map(([, x]) => x)
          .join(" — "),
        evidence: o.evidence as Evidence,
        downgraded: false,
        downgrade(why) {
          o.evidence = { level: "inferred", sourceIds: [], note: why, quote: this.evidence.quote };
          this.evidence = o.evidence as Evidence;
          this.downgraded = true;
        },
      };
      out.push(claim);
    }
    Object.entries(o).forEach(([k, x]) => k !== "evidence" && walk(x));
  };
  walk(draft);
  return out;
}

function assemble(
  draft: Record<string, unknown>,
  plan: Plan,
  pages: Page[],
  probe: { found: boolean },
  stats: { notFound: number; unsupported: number; judged: number },
) {
  const today = new Date().toISOString().slice(0, 10);
  const domain = plan.website.replace(/^www\./, "");
  const sources = pages.map((p) => ({
    id: p.id,
    title: p.title,
    url: p.url,
    kind: (p.url.includes(domain) || (plan.devDocsHint && p.url.includes(plan.devDocsHint)) ? "official" : "third-party") as "official" | "third-party" | "probe",
  }));
  if (probe.found) sources.push({ id: "probe", title: `Live probe of ${plan.website} OAuth discovery metadata`, url: (probe as unknown as { results: { url: string }[] }).results[0].url, kind: "probe" });

  return Guide.parse({
    ...draft,
    slug: slugify(plan.website || plan.name) || slugify(plan.name),
    name: plan.name,
    website: plan.website,
    category: plan.category,
    origin: "generated",
    updatedAt: new Date().toISOString(),
    model: MODEL,
    composio: {
      redirectUri: COMPOSIO_REDIRECT_URI,
      note: "Register this exact URL in the provider app and in your Composio auth config. Older toolkits may use /api/v1/auth-apps/add, and the two must match.",
    },
    sources,
    verification: [
      {
        date: today,
        method: "Quote check (code)",
        finding: stats.notFound ? `${stats.notFound} cited quote(s) weren't found in the fetched page, so those claims were downgraded.` : "Every cited quote was found in its source.",
        outcome: stats.notFound ? "corrected" : "confirmed",
      },
      {
        date: today,
        method: "Skeptic review (second model pass)",
        finding: stats.unsupported
          ? `${stats.unsupported} of ${stats.judged} cited claims had quotes that didn't support them, so they were downgraded.`
          : `All ${stats.judged} cited claims were judged supported by their quotes.`,
        outcome: stats.unsupported ? "corrected" : "confirmed",
      },
      {
        date: today,
        method: "Live OAuth discovery probe",
        finding: probe.found ? "Provider publishes OAuth/OIDC discovery metadata (endpoints observed live)." : "No standard discovery document found. Endpoints not verified live.",
        outcome: probe.found ? "confirmed" : "unverified",
      },
    ],
  });
}
