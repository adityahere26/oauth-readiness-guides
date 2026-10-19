/**
 * Research tools the agent can call. They're deliberately small and deterministic:
 * the model decides *what* to look at, these functions decide *what it actually sees*.
 */

export type SearchResult = { title: string; url: string; snippet: string };

const UA = "Mozilla/5.0 (compatible; OAuthGuideAgent/1.0; +https://github.com/)";

export async function webSearch(query: string): Promise<SearchResult[]> {
  if (process.env.TAVILY_API_KEY) {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.TAVILY_API_KEY}` },
      body: JSON.stringify({ query, max_results: 6, search_depth: "basic" }),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const data = (await res.json()) as { results: { title: string; url: string; content: string }[] };
      return data.results.map((r) => ({ title: r.title, url: r.url, snippet: r.content.slice(0, 300) }));
    }
  }
  return duckDuckGo(query);
}

/** Keyless fallback. Fragile by nature (HTML scraping), so Tavily is preferred when configured. */
async function duckDuckGo(query: string): Promise<SearchResult[]> {
  const res = await fetch("https://html.duckduckgo.com/html/", {
    method: "POST",
    headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ q: query }).toString(),
    signal: AbortSignal.timeout(15000),
  });
  const html = await res.text();
  if (/anomaly|captcha/i.test(html) && !html.includes("result__a")) throw new Error("DuckDuckGo blocked the request (bot check). Set TAVILY_API_KEY.");
  const results: SearchResult[] = [];
  const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html)) && results.length < 6) {
    let url = m[1];
    const uddg = url.match(/uddg=([^&]+)/);
    if (uddg) url = decodeURIComponent(uddg[1]);
    if (url.startsWith("//")) url = "https:" + url;
    if (url.includes("duckduckgo.com/y.js")) continue; // ads
    results.push({ title: stripTags(m[2]), url, snippet: stripTags(m[3]).slice(0, 300) });
  }
  return results;
}

const RELEVANT =
  /oauth|client[ _-]?(id|secret)|redirect|callback|scope|permission|review|verif|approv|marketplace|directory|partner|publish|distribut|security|assessment|audit|days|weeks|business|privacy|requirement|limit|install|consent|developer|app/i;

/**
 * Fetch a page and return only the passages most relevant to OAuth setup.
 * Keeps the model's context small (Groq has tight token-per-minute limits) and
 * makes every claim traceable to text we actually retrieved.
 */
export async function fetchPage(url: string, maxChars = 3500): Promise<{ url: string; title: string; text: string; ok: boolean }> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,*/*" }, redirect: "follow", signal: AbortSignal.timeout(15000) });
    const html = await res.text();
    const title = stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? url).slice(0, 120);
    const body = html
      .replace(/<(script|style|nav|footer|svg|noscript|header)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n");
    const paras = stripTags(body)
      .split(/\n+/)
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter((p) => p.length > 40);

    // Rank paragraphs by keyword density, then restore document order for readability.
    const scored = paras.map((p, i) => ({ p, i, s: (p.match(new RegExp(RELEVANT, "gi")) || []).length + (/\d+\s*(business )?(day|week|month)/i.test(p) ? 3 : 0) }));
    const picked: typeof scored = [];
    let total = 0;
    for (const x of [...scored].sort((a, b) => b.s - a.s)) {
      if (x.s === 0 || total + x.p.length > maxChars) continue;
      picked.push(x);
      total += x.p.length;
    }
    const text = picked.sort((a, b) => a.i - b.i).map((x) => x.p).join("\n");
    return { url: res.url || url, title, text: text || paras.join("\n").slice(0, maxChars), ok: res.ok };
  } catch (e) {
    return { url, title: url, text: `Fetch failed: ${(e as Error).message}`, ok: false };
  }
}

/**
 * A live, hands-on check the agent can run without credentials: does the provider
 * publish OAuth/OIDC discovery metadata? If so we get real endpoints and supported
 * scopes/grants. That's evidence we observed, not something we read in a blog.
 */
export async function probeOAuthMetadata(domain: string) {
  const host = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const candidates = [host, host.startsWith("www.") ? host.slice(4) : `www.${host}`, `accounts.${host.replace(/^www\./, "")}`, `auth.${host.replace(/^www\./, "")}`, `login.${host.replace(/^www\./, "")}`, `mcp.${host.replace(/^www\./, "")}`];
  const paths = ["/.well-known/oauth-authorization-server", "/.well-known/openid-configuration"];
  const found: Record<string, unknown>[] = [];
  await Promise.all(
    candidates.flatMap((h) =>
      paths.map(async (p) => {
        const url = `https://${h}${p}`;
        try {
          const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6000) });
          if (!res.ok || !(res.headers.get("content-type") || "").includes("json")) return;
          const j = (await res.json()) as Record<string, unknown>;
          if (!j.authorization_endpoint) return;
          found.push({
            url,
            issuer: j.issuer,
            authorization_endpoint: j.authorization_endpoint,
            token_endpoint: j.token_endpoint,
            registration_endpoint: j.registration_endpoint ?? null,
            scopes_supported: Array.isArray(j.scopes_supported) ? (j.scopes_supported as string[]).slice(0, 25) : undefined,
            code_challenge_methods_supported: j.code_challenge_methods_supported,
          });
        } catch {}
      }),
    ),
  );
  // The same server often answers on several hostnames; keep one entry per authorization endpoint.
  const unique = found.filter((r, i) => found.findIndex((x) => x.authorization_endpoint === r.authorization_endpoint) === i);
  return unique.length ? { found: true, results: unique } : { found: false, note: `No discovery document at ${candidates.length * paths.length} standard locations. Absence does not mean no OAuth.` };
}

function stripTags(s: string) {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .trim();
}
