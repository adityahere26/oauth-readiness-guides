import { toMarkdown } from "@/lib/markdown";
import { getGuide } from "@/lib/store";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const g = await getGuide((await params).slug);
  if (!g) return new Response("Not found", { status: 404 });
  return new Response(toMarkdown(g), {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="${g.slug}-oauth-guide.md"` },
  });
}
