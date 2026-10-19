import { z } from "zod";

/**
 * Every claim in a guide carries evidence:
 * - tested:   we (or the agent) actually did it / observed it live
 * - sourced:  stated by a document we read (linked via sourceIds)
 * - inferred: reasoning or model knowledge, not backed by a fetched source
 */
export const EvidenceLevel = z.enum(["tested", "sourced", "inferred"]);
export type EvidenceLevel = z.infer<typeof EvidenceLevel>;

export const Evidence = z.object({
  level: EvidenceLevel.catch("inferred"),
  sourceIds: z.array(z.string()).default([]),
  /** Short verbatim excerpt from the source; for generated guides it's checked against fetched text. */
  quote: z.string().optional(),
  note: z.string().optional(),
});
export type Evidence = z.infer<typeof Evidence>;

const inferred = { level: "inferred" as const, sourceIds: [] };
const ev = Evidence.default(inferred).catch(inferred);

export const Owner = z.enum(["agent", "you", "provider"]);
export type Owner = z.infer<typeof Owner>;

export const Guide = z.object({
  slug: z.string(),
  name: z.string(),
  website: z.string().default(""),
  category: z.string().default("Other"),
  origin: z.enum(["curated", "generated"]).default("generated"),
  updatedAt: z.string(),
  model: z.string().optional(),

  summary: z.string(),

  difficulty: z.object({
    score: z.coerce.number().min(1).max(5).catch(3),
    label: z.string(),
    why: z.string(),
  }),

  time: z.object({
    activeEffort: z.string(),
    approvalWait: z.string(),
    evidence: ev,
  }),

  /** Can the developer get a working OAuth flow for themselves today, before any review? */
  quickStart: z.object({
    canStartToday: z.boolean().catch(true),
    detail: z.string(),
    evidence: ev,
  }),

  /** The ladder from "works for me" to "works for everyone". */
  stages: z
    .array(
      z.object({
        name: z.string(),
        audience: z.string(),
        unlockedBy: z.string(),
        evidence: ev,
      }),
    )
    .default([]),

  requirements: z
    .array(
      z.object({
        item: z.string(),
        when: z.enum(["always", "conditional"]).catch("conditional"),
        detail: z.string(),
        evidence: ev,
      }),
    )
    .default([]),

  steps: z
    .array(
      z.object({
        title: z.string(),
        owner: Owner.catch("you"),
        detail: z.string(),
        eta: z.string().optional(),
        link: z.string().optional(),
        evidence: ev,
      }),
    )
    .default([]),

  blockers: z
    .array(
      z.object({
        issue: z.string(),
        workaround: z.string(),
        evidence: ev,
      }),
    )
    .default([]),

  scopes: z
    .array(
      z.object({
        name: z.string(),
        tier: z.enum(["basic", "review", "restricted", "paid"]).catch("review"),
        note: z.string(),
      }),
    )
    .default([]),

  composio: z
    .object({
      redirectUri: z.string(),
      note: z.string(),
    })
    .optional(),

  sources: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        url: z.string(),
        kind: z.enum(["official", "third-party", "composio", "probe"]).catch("third-party"),
      }),
    )
    .default([]),

  uncertainties: z.array(z.string()).default([]),

  /** Hands-on checks: what we tried and what changed as a result. */
  verification: z
    .array(
      z.object({
        date: z.string(),
        method: z.string(),
        finding: z.string(),
        outcome: z.enum(["confirmed", "corrected", "unverified"]),
      }),
    )
    .default([]),
});
export type Guide = z.infer<typeof Guide>;
export type GuideInput = z.input<typeof Guide>;

export const COMPOSIO_REDIRECT_URI = "https://backend.composio.dev/api/v3/toolkits/auth/callback";

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\.(com|io|dev|ai|app|co|so|net|org)(\/.*)?$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}
