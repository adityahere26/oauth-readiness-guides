import { EvidenceLegend } from "@/components/Evidence";

export const metadata = { title: "How it works · OAuth Readiness" };

export default function About() {
  const h = "mt-8 text-lg font-semibold";
  const p = "mt-2 text-zinc-700 dark:text-zinc-300";
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight">How it works</h1>

      <h2 className={h}>The problem</h2>
      <p className={p}>
        When your agent&apos;s users connect Gmail or Slack through Composio, the OAuth consent screen belongs to an <b>OAuth app</b> registered with the
        provider. Composio&apos;s managed apps let you start immediately. For production you&apos;ll usually want <b>your own</b> app: your brand on the
        consent screen, your own rate limits, and scopes the shared app doesn&apos;t have. Creating the app is often five minutes of work. Getting it approved
        for everyone can take anywhere from zero days to two months, and the docs rarely say which.
      </p>

      <h2 className={h}>What each guide answers</h2>
      <ul className={`${p} list-disc pl-5 space-y-1`}>
        <li><b>Can I start today?</b> Almost always yes, for yourself or test users. The guide says what that limit is.</li>
        <li><b>Hands-on time vs. approval wait</b>, kept separate because they need different plans.</li>
        <li><b>Stages</b>: the ladder from “works for me” to “works for everyone”, and what unlocks each rung.</li>
        <li><b>Steps by owner</b>: 🤖 what an agent can do, 👤 what needs your login or identity, ⏳ what you&apos;re waiting on.</li>
        <li><b>Blockers</b> found in docs and changelogs, each with a workaround.</li>
      </ul>

      <h2 className={h}>Evidence labels</h2>
      <p className={p}>Every claim carries one of three labels. Hover a badge to see the supporting quote.</p>
      <div className="mt-3"><EvidenceLegend /></div>

      <h2 className={h}>The live research agent</h2>
      <ol className={`${p} list-decimal pl-5 space-y-1`}>
        <li><b>Plan</b>: identify the product, its docs domain, and targeted search queries.</li>
        <li><b>Search ↔ select</b>: the model reads search snippets, picks official docs first, and can ask for one more round of searches to fill gaps.</li>
        <li><b>Read + probe</b>: pages are fetched and trimmed to OAuth-relevant passages. The agent also probes the provider&apos;s
          <code>/.well-known</code> OAuth discovery endpoints live. If it finds a dynamic client registration endpoint, an agent could create the client for you.</li>
        <li><b>Write</b>: the model fills a strict schema and must attach a verbatim quote to every sourced claim.</li>
        <li><b>Check citations</b>: code (not the model) checks each quote against the fetched text. Claims that don&apos;t match are downgraded to <i>unverified</i> and counted in the guide&apos;s verification log.</li>
      </ol>

      <h2 className={h}>Limitations</h2>
      <ul className={`${p} list-disc pl-5 space-y-1`}>
        <li>Review timelines are rarely published. Where a provider doesn&apos;t state one, we say so instead of guessing.</li>
        <li>Generated guides depend on what search returns. Pages that render with JavaScript or sit behind a login can&apos;t be read.</li>
        <li>The agent doesn&apos;t log in to provider consoles or create apps for you. Those steps are marked 👤.</li>
      </ul>
    </div>
  );
}
