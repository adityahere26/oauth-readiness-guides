import { Guide } from "./schema";

/**
 * Generated guides travel inside their share link (`/guides/<slug>#g=<payload>`), so links work
 * without a database. The payload is deflate-compressed JSON in base64url (~3–5 KB for a guide).
 * CompressionStream exists in modern browsers and Node 18+, so the same code runs on both sides.
 */
export async function encodeGuide(g: Guide): Promise<string> {
  const stream = new Blob([JSON.stringify(g)]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function decodeGuide(payload: string): Promise<Guide | null> {
  try {
    const bin = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    const parsed = Guide.safeParse(JSON.parse(await new Response(stream).text()));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function shareUrlFor(g: Guide) {
  return g.origin === "curated" ? `/guides/${g.slug}` : `/guides/${g.slug}#g=${await encodeGuide(g)}`;
}
