import type { Metadata } from "next";
import { GuideView } from "@/components/GuideView";
import { SharedGuide } from "@/components/SharedGuide";
import { shareUrlFor } from "@/lib/share";
import { getGuide } from "@/lib/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = await getGuide((await params).slug);
  return { title: g ? `${g.name} OAuth app setup · OAuth Readiness` : "OAuth guide · OAuth Readiness", description: g?.summary };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const g = await getGuide(slug);
  // Not stored on this server (e.g. serverless without a database): the browser renders it from the share link.
  if (!g) return <SharedGuide slug={slug} />;
  return <GuideView g={g} shareUrl={await shareUrlFor(g)} />;
}
