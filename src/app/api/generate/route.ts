import { curatedGuides } from "@/data/curated";
import { generateGuide, type AgentEvent } from "@/lib/agent";
import { slugify } from "@/lib/schema";
import { getGenerated, saveGenerated } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 300;

const CACHE_MS = 7 * 24 * 3600 * 1000;

/** Streams newline-delimited JSON AgentEvents so the UI can show the agent working live. */
export async function POST(req: Request) {
  const { app, fresh } = (await req.json().catch(() => ({}))) as { app?: string; fresh?: boolean };
  const input = (app ?? "").trim().slice(0, 120);
  if (!input) return Response.json({ error: "Enter an app name or website" }, { status: 400 });
  if (!process.env.GROQ_API_KEY) return Response.json({ error: "Server is missing GROQ_API_KEY" }, { status: 500 });

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: AgentEvent) => controller.enqueue(new TextEncoder().encode(JSON.stringify(e) + "\n"));
      try {
        const key = slugify(input);
        const curated = curatedGuides.find((g) => g.slug === key || slugify(g.website) === key || slugify(g.name) === key);
        if (curated && !fresh) {
          emit({ type: "step", label: `${curated.name} is already in the curated library` });
          emit({ type: "done", slug: curated.slug });
          return;
        }
        const cached = await getGenerated(key);
        if (cached && !fresh && Date.now() - Date.parse(cached.updatedAt) < CACHE_MS) {
          emit({ type: "step", label: `Found a guide generated ${cached.updatedAt.slice(0, 10)}`, detail: "Use 'regenerate' on the guide page for a fresh run." });
          emit({ type: "done", slug: cached.slug, guide: cached });
          return;
        }

        const guide = await generateGuide(input, emit);
        if (curatedGuides.some((g) => g.slug === guide.slug)) guide.slug = `${guide.slug}-agent`;
        // Best effort: without a database (e.g. on serverless) the guide still reaches the browser in the done event.
        await saveGenerated(guide).catch((e) => console.warn("saveGenerated failed", e));
        emit({ type: "done", slug: guide.slug, guide });
      } catch (e) {
        console.error(e);
        emit({ type: "error", message: (e as Error).message || "Generation failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}
