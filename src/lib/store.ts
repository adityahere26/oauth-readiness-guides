import { promises as fs } from "fs";
import path from "path";
import { Redis } from "@upstash/redis";
import { curatedGuides } from "@/data/curated";
import { Guide } from "./schema";

/**
 * Generated guides need to survive so their links can be shared.
 * Production: Upstash Redis (free tier, works on Vercel).
 * Local dev: a JSON file under .data/ (on Vercel without Redis this falls back to /tmp, which is ephemeral).
 */
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
    : null;

const FILE = path.join(process.env.VERCEL ? "/tmp" : process.cwd(), ".data", "generated.json");

async function readFile(): Promise<Record<string, Guide>> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return {};
  }
}

export async function getGenerated(slug: string): Promise<Guide | null> {
  const raw = redis ? await redis.get(`guide:${slug}`) : (await readFile())[slug];
  if (!raw) return null;
  const parsed = Guide.safeParse(typeof raw === "string" ? JSON.parse(raw) : raw);
  return parsed.success ? parsed.data : null;
}

export async function listGenerated(): Promise<Guide[]> {
  if (redis) {
    const slugs = await redis.zrange<string[]>("guides", 0, 49, { rev: true });
    const guides = await Promise.all(slugs.map(getGenerated));
    return guides.filter((g): g is Guide => !!g);
  }
  return Object.values(await readFile()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveGenerated(guide: Guide) {
  if (redis) {
    await redis.set(`guide:${guide.slug}`, JSON.stringify(guide));
    await redis.zadd("guides", { score: Date.now(), member: guide.slug });
    return;
  }
  const all = await readFile();
  all[guide.slug] = guide;
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(all, null, 2));
}

export async function getGuide(slug: string): Promise<Guide | null> {
  return curatedGuides.find((g) => g.slug === slug) ?? (await getGenerated(slug));
}
