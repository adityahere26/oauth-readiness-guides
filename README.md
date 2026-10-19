# OAuth Readiness Guides

**How long until your users can connect an app?** Setup and approval guides for provider OAuth apps, for developers building agents on Composio. There's a curated library, plus a research agent that writes a guide for any app on demand. Every claim is labeled by how we know it.

- **Live:** _<your Vercel URL>_
- **Try:** open [Gmail](/guides/gmail) (hardest), [GitHub](/guides/github) (easiest), or type any app (e.g. "Zoom", "airtable.com") into the box on the home page.

---

## The problem, as I understood it

A Composio user's end-users connect their accounts through a provider **OAuth app**. Composio's managed apps get you started immediately. For production you usually need **your own** app: your brand on the consent screen, your own rate limits, scopes the shared app doesn't have, and toolkits with no managed app at all.

Creating that app is often five minutes of work. **Getting it approved for everyone** takes anywhere from zero days (GitHub) to 6+ weeks plus a paid annual audit (Gmail with restricted scopes), and the provider's docs rarely put the two side by side. Composio's per-app auth pages (e.g. `composio.dev/auth/notion`) explain *which buttons to click*. They don't say how long it takes, what review is needed, or what will block you.

So each guide answers, in order:

1. **Can I start today?** Almost always yes, for you or test users. The guide says exactly what that limit is.
2. **Hands-on time vs. approval wait**, kept apart because they need different plans: you can't work harder to make Google review faster.
3. **Stages**: the ladder from "works for me" → "works for my test users" → "works for everyone", and what unlocks each step.
4. **Steps by owner**: 🤖 an agent can do it · 👤 needs your login, identity or payment · ⏳ waiting on the provider.
5. **Blockers with workarounds**, mostly the ones that only show up in changelogs or live consoles.
6. **Evidence**: every claim is ✓ *tested*, ◆ *sourced* (linked, with a quote on hover), or ? *unverified*.

Guides can be shared (stable URL), exported (Markdown download for a ticket or Slack), and worked through (step checkboxes remembered per browser).

## Key decisions

| Decision | Why |
|---|---|
| **Separate effort from wait** in the schema itself | It's the question developers can't answer from docs, and the one that decides launch dates. |
| **Evidence label on every claim**, not one per guide | Provider docs go stale fast. Readers need to know *which* line to double-check. |
| **Pipeline agent, not a free-form tool loop** | Groq's free tier has tight tokens/minute. A fixed plan → search ↔ select → read → write → check sequence costs about 4 LLM calls, finishes in about 15–40 s, and is easy to audit. The model still makes the judgement calls: what to search, which pages to read, when to search again. |
| **Code checks quotes, a second model pass checks support** | In testing, the first draft cited real pages for claims they didn't make (e.g. "review takes 5–10 business days"). Matching quotes in code catches invented quotes. The skeptic pass catches real quotes attached to the wrong claim. Failures are downgraded to *unverified*, not hidden. |
| **Gap check before concluding "no review"** | Absence of evidence was the most dangerous failure (Dropbox: the agent first said "no review needed", but production approval is required at 50 users). If the draft finds no approval process, the agent searches again specifically for one. |
| **Live OAuth discovery probe** | A small, credential-free hands-on check: `/.well-known/openid-configuration` and `oauth-authorization-server` on the provider's domains (including `mcp.`). It produced real findings, e.g. Atlassian, Calendly and Dropbox advertise **dynamic client registration** endpoints, which is how an agent could register a client itself. That's mostly for MCP clients, so the guide says to test it, not that it works. |
| **Curated library + live agent share one schema** | Curated guides are the quality bar the agent is held to, and every guide renders the same way. |

## What I tested, what's sourced, what's uncertain

**Hands-on (browser agent in real consoles, 2026-10-19):**

| Provider | What happened | What changed in the guide |
|---|---|---|
| GitHub | Created an OAuth app; opened its consent screen | Confirmed instant, no review. **Corrected** "callback URL" → "Redirect URIs" (+ wildcard option). **Added** new-app trust warnings on the consent screen and the visible `backend.composio.dev` redirect. |
| Google | Inspected Auth Platform in a real project | Confirmed menu/steps. **Corrected**: test users count toward the 100-user lifetime cap. **Added** the 10,000/day token-grant limit and the billing-identity checkup. Verification/CASA **not attempted**. |
| Slack | Created + installed an app from an agent-written manifest in a fresh workspace; read Manage Distribution | **Corrected**: "From scratch" is now "Blank app", and create + install is now one step. **Added**: workspace lock-in, and the consent screen binding users to *your* privacy policy/terms. Marketplace review **not attempted**. |

**Checked against sources:** every curated source URL resolves (script-checked). Several redirected to new canonical docs and were updated. Research corrections:
- Salesforce restricted *new Connected Apps* in Spring '26. Most tutorials are out of date.
- A "Local" Salesforce External Client App only works in its own org.
- HubSpot caps unlisted apps at 25 installs.
- Slack limits history calls for unlisted apps to 1 req/min.
- Composio docs list two redirect URIs (v3 and legacy v1).
- Gmail `send` is *sensitive* but `readonly`/`modify` are *restricted*.

**Agent runs (Calendly, Zoom, Dropbox):** the verification log on each generated guide records how many claims were downgraded and why. Typical result: 2–7 of 11–17 claims downgraded.

**Uncertain:**
- Most providers don't publish review turnaround (Slack, HubSpot, Notion, LinkedIn). Guides say so instead of guessing.
- CASA cost varies by lab; no quote obtained.
- X pricing comes from third-party sources only.
- Salesforce Local-vs-Packaged behaviour comes from third-party sources.

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in keys
npm run dev                   # http://localhost:3000
```

| Variable | Required | Notes |
|---|---|---|
| `GROQ_API_KEY` | yes | console.groq.com (free) |
| `TAVILY_API_KEY` | strongly recommended | tavily.com (free). Without it the agent falls back to DuckDuckGo HTML, which often returns a bot-check page. |
| `GROQ_MODEL` | no | default `openai/gpt-oss-120b` |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | on Vercel | Persists generated guides so share links survive. Locally they're saved to `.data/`. |

**Deploy:** `npx vercel` → add the env vars above → `npx vercel --prod`. Upstash Redis can be added from the Vercel Marketplace (free).

## Code map

- `src/lib/schema.ts`: guide schema (zod) and evidence model
- `src/data/curated.ts`: the 8 curated guides, with sources and verification logs
- `src/lib/agent.ts`: research pipeline, quote check, skeptic pass, gap check
- `src/lib/tools.ts`: search (Tavily / DuckDuckGo), relevance-trimmed page fetch, OAuth discovery probe
- `src/app/api/generate/route.ts`: streams agent progress as NDJSON; caches generated guides for 7 days
- `src/app/guides/[slug]/page.tsx`: guide page · `api/guides/[slug]/markdown`: export

## Limitations

- The agent can't read pages that render with JavaScript or sit behind a login (e.g. community forums, some consoles). It can't log in to provider consoles, so "you" steps stay with the developer.
- The skeptic pass is deliberately strict and sometimes rejects a correct claim, e.g. when the model stitches two quotes together with "…". Erring toward "unverified" is the intended failure mode.
- Difficulty scores are a judgement on a 1–5 scale, not a measurement.
- 8 curated guides, not 100. The schema and agent are built so the library can grow by running the agent and then having a human review each draft.
- No auth or rate limiting on `/api/generate`. Fine for a demo, but it needs adding before public use.
