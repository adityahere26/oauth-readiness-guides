"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Generator } from "@/components/Generator";
import { GuideView } from "@/components/GuideView";
import { Guide } from "@/lib/schema";
import { decodeGuide, shareUrlFor } from "@/lib/share";

/** Shows a generated guide the server doesn't have: from the share link's #g= payload, or the just-finished run. */
export function SharedGuide({ slug }: { slug: string }) {
  const [state, setState] = useState<{ g: Guide; url: string } | "loading" | "missing">("loading");

  useEffect(() => {
    (async () => {
      let g: Guide | null = null;
      const payload = new URLSearchParams(location.hash.slice(1)).get("g");
      if (payload) g = await decodeGuide(payload);
      if (!g) {
        try {
          const raw = sessionStorage.getItem(`guide:${slug}`);
          if (raw) g = Guide.parse(JSON.parse(raw));
        } catch {}
      }
      if (!g) return setState("missing");
      const url = await shareUrlFor(g);
      // Put the payload in the address bar so copying the URL from the browser also shares it.
      if (!payload) history.replaceState(null, "", url);
      setState({ g, url });
    })();
  }, [slug]);

  if (state === "loading") return <p className="text-zinc-500">Loading guide…</p>;
  if (state === "missing")
    return (
      <div className="max-w-xl">
        <Link href="/" className="text-sm text-zinc-500">← Library</Link>
        <h1 className="mt-3 text-2xl font-bold">Guide not found</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">This guide isn&apos;t in the library and the link doesn&apos;t include its contents. Generate it now:</p>
        <div className="mt-4"><Generator initial={slug.replace(/-/g, " ")} /></div>
      </div>
    );
  return <GuideView g={state.g} shareUrl={state.url} />;
}
