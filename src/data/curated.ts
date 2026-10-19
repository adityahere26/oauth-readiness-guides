import { COMPOSIO_REDIRECT_URI, Guide, type GuideInput } from "@/lib/schema";

const src = (...sourceIds: string[]) => ({ level: "sourced" as const, sourceIds });
const inf = (note?: string) => ({ level: "inferred" as const, sourceIds: [], note });
const tested = (note: string, ...sourceIds: string[]) => ({ level: "tested" as const, sourceIds, note });

const REVIEWED = "2026-10-19";

const composioSource = {
  id: "composio-custom",
  title: "Composio: Custom auth configs (own OAuth app, redirect URI)",
  url: "https://docs.composio.dev/docs/auth-configuration/custom-auth-configs",
  kind: "composio" as const,
};

const composio = {
  redirectUri: COMPOSIO_REDIRECT_URI,
  note: "Register this exact URL in the provider app and in your Composio auth config. Some older toolkit defaults use https://backend.composio.dev/api/v1/auth-apps/add. Both still work, but the two must match or you get redirect_uri_mismatch. Consent screens will show users \"redirect to backend.composio.dev\". To show your own domain, register your own redirect endpoint that forwards to Composio (white-labeling).",
};

const raw: GuideInput[] = [
  // ───────────────────────────── GitHub ─────────────────────────────
  {
    slug: "github",
    name: "GitHub",
    website: "github.com",
    category: "Developer tools",
    origin: "curated",
    updatedAt: REVIEWED,
    summary:
      "Self-service, no review. You can have a working OAuth app in about 5 minutes. The main nuance is organizations that restrict third-party OAuth apps.",
    difficulty: { score: 1, label: "Easy", why: "Instant self-serve registration, no approval, no paid plan." },
    time: { activeEffort: "5–10 min", approvalWait: "None", evidence: src("gh-create") },
    quickStart: {
      canStartToday: true,
      detail: "Any GitHub user can authorize the app as soon as it's registered.",
      evidence: src("gh-create"),
    },
    stages: [
      {
        name: "Live for everyone",
        audience: "Any GitHub user",
        unlockedBy: "Registering the app. There is no review.",
        evidence: src("gh-create"),
      },
      {
        name: "Org data access",
        audience: "Members of orgs with OAuth app access restrictions",
        unlockedBy: "An org owner approving your app for that org",
        evidence: src("gh-restrictions"),
      },
    ],
    requirements: [
      { item: "GitHub account (personal or org admin)", when: "always", detail: "Register the app under an org if your team should co-own it.", evidence: src("gh-create") },
      { item: "Homepage URL", when: "always", detail: "Any public URL. No domain verification.", evidence: src("gh-create") },
      { item: "Redirect URI", when: "always", detail: "Up to 10 per app. The live form calls these 'Redirect URIs' (docs still say 'callback URL') and offers an 'Allow wildcard matching' option. Leave it off.", evidence: tested("Seen in the live form, 2026-10-19", "gh-create") },
    ],
    steps: [
      { title: "Open Developer settings → OAuth apps → New OAuth App", owner: "you", detail: "Under your profile or the org's settings.", link: "https://github.com/settings/applications/new", eta: "1 min", evidence: tested("Done live, 2026-10-19", "gh-create") },
      { title: "Fill in name, homepage and redirect URI", owner: "agent", detail: `The agent can prefill these. Redirect URI: ${COMPOSIO_REDIRECT_URI}. Keep 'Expire user access tokens' on (the default). Composio handles refresh tokens.`, eta: "1 min", evidence: tested("Agent filled the live form via browser automation, 2026-10-19", "gh-create", "composio-custom") },
      { title: "Register, then generate a client secret", owner: "you", detail: "The app is live the moment you click Register, with no review. The secret is shown once. Copy it straight into a secret manager or the Composio dashboard.", eta: "1 min", evidence: tested("App created instantly, 2026-10-19", "gh-create") },
      { title: "Create a Composio auth config with your credentials", owner: "agent", detail: "Dashboard → Create Auth Config → GitHub → OAuth2 → 'Use your own developer credentials'.", eta: "2 min", evidence: src("composio-custom") },
      { title: "Test a connection", owner: "you", detail: "Connect your own account and confirm the consent screen shows your app name.", eta: "2 min", evidence: tested("Consent screen rendered for the new app with the Composio redirect, 2026-10-19") },
    ],
    blockers: [
      { issue: "Users from some orgs can't see org repos after authorizing", workaround: "Ask an org owner to approve your app under Org settings → Third-party access. Tell users to request approval during consent.", evidence: src("gh-restrictions") },
      { issue: "Brand-new apps look untrustworthy on the consent screen", workaround: "GitHub shows users 'Not owned or operated by GitHub · Created less than a day ago · Fewer than 10 GitHub users'. Create the app early, under your org, with a real name, logo and homepage.", evidence: tested("Seen on the live consent screen, 2026-10-19") },
      { issue: "You need fine-grained, per-repo permissions", workaround: "Consider a GitHub App instead. GitHub recommends it over OAuth apps, but check that your Composio toolkit supports it.", evidence: src("gh-create") },
    ],
    scopes: [
      { name: "repo", tier: "basic", note: "Full private repo access. No review, but users see a broad permission prompt." },
      { name: "read:user, user:email", tier: "basic", note: "Profile and email." },
    ],
    composio,
    sources: [
      { id: "gh-create", title: "GitHub Docs: Creating an OAuth app", url: "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app", kind: "official" },
      { id: "gh-restrictions", title: "GitHub Docs: About OAuth app access restrictions", url: "https://docs.github.com/en/organizations/managing-oauth-access-to-your-organizations-data/about-oauth-app-access-restrictions", kind: "official" },
      composioSource,
    ],
    uncertainties: [],
    verification: [
      { date: "2026-10-19", method: "Created an OAuth app in the live GitHub UI (browser agent)", finding: "Registration was instant with no review. Marketplace listing is optional.", outcome: "confirmed" },
      { date: "2026-10-19", method: "Compared live form with docs", finding: "The UI now says 'Redirect URIs' and adds 'Allow wildcard matching'. The docs still say 'Authorization callback URL'. Guide updated.", outcome: "corrected" },
      { date: "2026-10-19", method: "Opened the authorize URL for the new app", finding: "Consent screen works. It shows new-app trust warnings and 'Authorizing will redirect to https://backend.composio.dev'. Added as a blocker and a white-labeling note.", outcome: "corrected" },
    ],
  },

  // ───────────────────────────── Slack ─────────────────────────────
  {
    slug: "slack",
    name: "Slack",
    website: "slack.com",
    category: "Communication",
    origin: "curated",
    updatedAt: REVIEWED,
    summary:
      "Quick to create and install in your own workspace. Other workspaces can install it without review ('public distribution'), but unlisted apps get much lower rate limits on reading message history. Removing that limit means a Marketplace review.",
    difficulty: { score: 2, label: "Moderate", why: "Self-serve for most uses. Marketplace review is only needed for higher history rate limits or a listing." },
    time: { activeEffort: "20–40 min", approvalWait: "None unlisted · Marketplace review: not published (plan for weeks)", evidence: src("slack-marketplace") },
    quickStart: {
      canStartToday: true,
      detail: "Install to your own workspace right away. Turn on public distribution so other workspaces can install it too, with no review.",
      evidence: src("slack-distribution"),
    },
    stages: [
      { name: "Your workspace", audience: "Your own workspace", unlockedBy: "Creating and installing the app", evidence: src("slack-distribution") },
      { name: "Unlisted public distribution", audience: "Any workspace via your install link", unlockedBy: "Manage Distribution → Activate Public Distribution (HTTPS redirect URLs required)", evidence: src("slack-distribution", "slack-ratelimit") },
      { name: "Slack Marketplace", audience: "Discoverable listing; normal history rate limits", unlockedBy: "Passing Marketplace review", evidence: src("slack-marketplace") },
    ],
    requirements: [
      { item: "A Slack workspace where you can install apps", when: "always", detail: "Some workspaces require admin approval for app installs.", evidence: inf("Common workspace setting; confirm with your admin.") },
      { item: "A company-owned 'home' workspace for the app", when: "always", detail: "The workspace you create the app in can't be changed later, and if you leave it you lose access to the app. Don't use a personal or community workspace.", evidence: tested("Warning shown in the live create dialog, 2026-10-19") },
      { item: "HTTPS redirect URL", when: "always", detail: "Required before you can turn on public distribution.", evidence: src("slack-distribution") },
      { item: "Landing page, support page, privacy policy", when: "conditional", detail: "Marketplace listing only.", evidence: src("slack-marketplace") },
      { item: "Narrow scopes", when: "conditional", detail: "Broad *:history and admin scopes are unlikely to be approved for the Marketplace.", evidence: src("slack-marketplace") },
    ],
    steps: [
      { title: "Generate an app manifest", owner: "agent", detail: "The agent writes a manifest with your bot/user scopes and the Composio redirect URL, so you skip clicking through the scope UI.", eta: "2 min", evidence: inf() },
      { title: "Create the app from the manifest", owner: "you", detail: "api.slack.com/apps → Create an App → 'From a manifest' (other options: AI agent, Starter app, Blank app) → paste the JSON → choose a workspace.", link: "https://api.slack.com/apps", eta: "3 min", evidence: tested("Dialog and manifest editor used live, 2026-10-19") },
      { title: "Install to your workspace and test", owner: "you", detail: "The manifest flow now ends with 'Create and Install', so creating and installing is one step and goes straight to the consent screen.", eta: "2 min", evidence: tested("Created and installed into a test workspace, 2026-10-19", "slack-distribution") },
      { title: "Activate public distribution", owner: "you", detail: "Manage Distribution checklist: Enable Features & Functionality · Add OAuth Redirect URLs · Remove Hard Coded Information · Use HTTPS → Activate Public Distribution. Needed for your users' workspaces. No review.", eta: "5 min", evidence: tested("Checklist read live; activation not clicked, 2026-10-19", "slack-distribution") },
      { title: "Copy client ID/secret into a Composio auth config", owner: "agent", detail: "Basic Information → App Credentials.", eta: "2 min", evidence: src("composio-custom") },
      { title: "(Optional) Submit to the Marketplace", owner: "provider", detail: "Only if you need Tier 3 history limits or discoverability.", eta: "Weeks (unpublished)", evidence: src("slack-marketplace") },
    ],
    blockers: [
      { issue: "Reading channel history is very slow for unlisted apps", workaround: "Since 2025, conversations.history/replies for commercially distributed non-Marketplace apps is limited to 1 request/min and 15 messages. Design for it (webhooks/Events API) or go through Marketplace review.", evidence: src("slack-ratelimit") },
      { issue: "Workspace admin must approve the install", workaround: "Share a one-paragraph explanation of the scopes with the admin. Request only the scopes you need.", evidence: inf() },
      { issue: "Consent screen says users agree to *your* privacy policy and terms", workaround: "Even unlisted, users see 'you are also agreeing to <app>'s privacy agreement and terms of service'. Publish both pages before inviting real users.", evidence: tested("Seen on the live install consent screen, 2026-10-19") },
      { issue: "Free-plan workspaces only expose 90 days of history", workaround: "Set user expectations. This isn't fixable on your side.", evidence: src("slack-marketplace") },
    ],
    scopes: [
      { name: "chat:write, channels:read, users:read", tier: "basic", note: "Fine unlisted and in the Marketplace." },
      { name: "channels:history, groups:history", tier: "review", note: "Works unlisted at 1 req/min. Marketplace approval needs a clear use case." },
      { name: "admin.*", tier: "restricted", note: "Effectively partner-only." },
    ],
    composio,
    sources: [
      { id: "slack-distribution", title: "Slack: Distributing your app", url: "https://docs.slack.dev/app-management/distribution/", kind: "official" },
      { id: "slack-marketplace", title: "Slack Marketplace: App guidelines and requirements", url: "https://docs.slack.dev/slack-marketplace/slack-marketplace-app-guidelines-and-requirements/", kind: "official" },
      { id: "slack-ratelimit", title: "Slack changelog: Rate limit changes for non-Marketplace apps (2025-05-29)", url: "https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps", kind: "official" },
      composioSource,
    ],
    uncertainties: [
      "Slack does not publish a Marketplace review turnaround time.",
      "The date the history limit applies to existing installs moved between changelog revisions (Sep 2025 → Mar 2026).",
    ],
    verification: [
      { date: "2026-10-19", method: "Opened the live create-app flow (browser agent)", finding: "Options are now AI agent / Starter app / From a manifest / Blank app ('From scratch' is gone). The agent-written manifest was accepted by the editor.", outcome: "corrected" },
      { date: "2026-10-19", method: "Create dialog", finding: "Found the workspace lock-in warning, which wasn't in the docs we read. Added as a requirement.", outcome: "corrected" },
      { date: "2026-10-19", method: "Created + installed the app in a fresh test workspace", finding: "Manifest with 4 bot scopes and the Composio redirect URL accepted; 'Create and Install' goes straight to consent; install succeeded. No review at any point.", outcome: "confirmed" },
      { date: "2026-10-19", method: "Manage Distribution page", finding: "Public-distribution checklist matches the docs plus 'Enable Features & Functionality'. Did not activate distribution or test the Marketplace review.", outcome: "confirmed" },
    ],
  },

  // ───────────────────────────── Google / Gmail ─────────────────────────────
  {
    slug: "gmail",
    name: "Google (Gmail)",
    website: "gmail.com",
    category: "Email",
    origin: "curated",
    updatedAt: REVIEWED,
    summary:
      "Creating the OAuth client takes minutes. Going to production is the hard part. Reading or modifying mail uses restricted scopes, which need app verification plus a yearly third-party security assessment (CASA). Plan on 6+ weeks. If you only send email, the scope is 'sensitive', which takes about 10 business days and no audit.",
    difficulty: { score: 5, label: "Hard", why: "Restricted scopes need verification plus a paid, annual security assessment." },
    time: {
      activeEffort: "1–2 h setup · 1–3 days preparing verification (video, policy, justification)",
      approvalWait: "Brand ~2–3 business days · Sensitive ~10 business days · Restricted ~6 weeks + CASA",
      evidence: src("g-faq"),
    },
    quickStart: {
      canStartToday: true,
      detail: "In 'Testing' mode you can add test users and build end-to-end today, but their authorizations expire after 7 days. Internal Workspace apps skip verification for users in your own domain.",
      evidence: src("g-testing", "g-faq"),
    },
    stages: [
      { name: "Testing", audience: "Listed test users only (they count toward the 100-user lifetime cap)", unlockedBy: "Creating the consent screen. Tokens expire after 7 days.", evidence: tested("Audience page shows '0 users (0 test, 0 other) / 100 user cap'", "g-testing") },
      { name: "Internal", audience: "Users in your Google Workspace org", unlockedBy: "User type = Internal. No verification.", evidence: src("g-faq") },
      { name: "In production, unverified", audience: "Up to 100 users total (lifetime cap), with a warning screen", unlockedBy: "Publishing the app", evidence: src("g-faq") },
      { name: "Verified (sensitive scopes)", audience: "Everyone", unlockedBy: "Brand + sensitive scope verification", evidence: src("g-faq", "g-requirements") },
      { name: "Verified (restricted scopes)", audience: "Everyone", unlockedBy: "Verification + CASA assessment, renewed yearly", evidence: src("g-faq", "g-requirements") },
    ],
    requirements: [
      { item: "Google Cloud project", when: "always", detail: "Free. The console's 'Project checkup' also flags Developer identity → billing account verification. A verified billing account strengthens your verification case.", evidence: tested("Project checkup panel seen live, 2026-10-19") },
      { item: "Domain verified in Google Search Console", when: "conditional", detail: "Every authorized domain, verified by a project owner/editor. Needed for verification.", evidence: src("g-requirements") },
      { item: "Real homepage (not just a login page)", when: "conditional", detail: "On your verified domain, describing the app.", evidence: src("g-requirements") },
      { item: "Privacy policy disclosing Google user data use", when: "conditional", detail: "Same domain, linked from homepage and consent screen.", evidence: src("g-requirements") },
      { item: "Demo video of the full OAuth flow", when: "conditional", detail: "Sensitive/restricted scopes. Must show exact scopes in English.", evidence: src("g-requirements") },
      { item: "Scope justification", when: "conditional", detail: "Explain why narrower scopes won't work.", evidence: src("g-requirements") },
      { item: "CASA security assessment (annual)", when: "conditional", detail: "Restricted scopes only. Done by a Google-empanelled lab. Paid; quotes vary widely by lab.", evidence: src("g-requirements", "g-faq") },
    ],
    steps: [
      { title: "Decide your scopes first", owner: "agent", detail: "The agent maps your features to the narrowest Gmail scopes. gmail.send (sensitive) avoids CASA. gmail.readonly/modify (restricted) do not.", eta: "10 min", evidence: src("g-scopes") },
      { title: "Create a Google Cloud project and enable the Gmail API", owner: "you", detail: "console.cloud.google.com → APIs & Services → Library → Gmail API.", link: "https://console.cloud.google.com/apis/library/gmail.googleapis.com", eta: "5 min", evidence: inf() },
      { title: "Configure the consent screen (Google Auth Platform)", owner: "you", detail: "console.cloud.google.com/auth → Branding, Audience (External/Internal), Data access (scopes). Add yourself as a test user. You can't publish until Branding is complete.", link: "https://console.cloud.google.com/auth/overview", eta: "15 min", evidence: tested("Menu and 'complete Branding to publish' rule seen live, 2026-10-19") },
      { title: "Create an OAuth client (Web application)", owner: "you", detail: `Authorized redirect URI: ${COMPOSIO_REDIRECT_URI}`, eta: "3 min", evidence: src("composio-custom") },
      { title: "Plug credentials into Composio and test with a test user", owner: "agent", detail: "Create auth config with your own credentials.", eta: "5 min", evidence: src("composio-custom") },
      { title: "Prepare the verification package", owner: "agent", detail: "The agent drafts the privacy policy section on Google data, the scope justifications and the demo-video script. You publish them and record the video.", eta: "1–3 days", evidence: src("g-requirements") },
      { title: "Verify domain in Search Console and submit for verification", owner: "you", detail: "Google Auth Platform → Verification Center.", eta: "30 min", evidence: src("g-requirements") },
      { title: "Google review (+ CASA for restricted scopes)", owner: "provider", detail: "Reply to Google's emails quickly. Timelines are estimates and depend on your response time.", eta: "10 business days → 6+ weeks", evidence: src("g-faq") },
    ],
    blockers: [
      { issue: "Daily cap on new authorizations", workaround: "New projects show 'per-day token grant rate limit is 10,000 grants per day'. Request a raise from the OAuth overview page before a big launch.", evidence: tested("Seen on OAuth overview, 2026-10-19") },
      { issue: "Test users get logged out every 7 days", workaround: "Expected in Testing mode. Use an Internal app for your own team, or publish.", evidence: src("g-testing") },
      { issue: "100-user cap reached while unverified", workaround: "The cap is lifetime per project and can't be reset. Start verification before you need user #100.", evidence: src("g-faq") },
      { issue: "Verification rejected: homepage/privacy policy issues", workaround: "Homepage must describe the app (not just log in). The privacy policy link must match exactly on the consent screen and homepage.", evidence: src("g-requirements") },
      { issue: "CASA cost and annual renewal", workaround: "Narrow to sensitive scopes (e.g. gmail.send + gmail.labels) if your features allow it.", evidence: src("g-scopes", "g-faq") },
    ],
    scopes: [
      { name: "gmail.labels", tier: "basic", note: "Non-sensitive." },
      { name: "gmail.send", tier: "review", note: "Sensitive: verification, no CASA." },
      { name: "gmail.readonly, gmail.modify, gmail.compose, gmail.metadata", tier: "restricted", note: "Restricted: verification + annual CASA." },
      { name: "https://mail.google.com/", tier: "restricted", note: "Full mailbox." },
    ],
    composio,
    sources: [
      { id: "g-faq", title: "Google Cloud Help: OAuth verification FAQ (timelines, 100-user cap, annual reassessment)", url: "https://support.google.com/cloud/answer/13463817", kind: "official" },
      { id: "g-requirements", title: "Google Cloud Help: Verification requirements", url: "https://support.google.com/cloud/answer/13464321", kind: "official" },
      { id: "g-testing", title: "Google Cloud Help: Manage app audience (testing, 7-day expiry)", url: "https://support.google.com/cloud/answer/15549945", kind: "official" },
      { id: "g-scopes", title: "Gmail API: Choose scopes (sensitivity table)", url: "https://developers.google.com/workspace/gmail/api/auth/scopes", kind: "official" },
      composioSource,
    ],
    uncertainties: [
      "CASA cost: third-party lab quotes range from about $500 to several thousand USD per year. Older reports cite $15k+. We did not obtain a quote.",
      "Google's timelines are estimates; they are explicitly 'not guaranteed'.",
      "Whether a missing billing account actually blocks verification wasn't tested. The console only flags it.",
    ],
    verification: [
      { date: "2026-10-19", method: "Inspected Google Auth Platform in a real project (browser agent)", finding: "Menu is Branding / Audience / Clients / Data access / Verification centre, matching the guide's steps.", outcome: "confirmed" },
      { date: "2026-10-19", method: "Audience page", finding: "100-user lifetime cap confirmed, and the counter includes test users. Guide updated to say test users consume the cap.", outcome: "corrected" },
      { date: "2026-10-19", method: "OAuth overview page", finding: "Found a 10,000/day token grant limit and a billing-verification identity check that the docs we read didn't mention. Added both.", outcome: "corrected" },
      { date: "2026-10-19", method: "Not attempted", finding: "Did not submit verification or obtain a CASA quote, so timelines and costs remain sourced, not tested.", outcome: "unverified" },
    ],
  },

  // ───────────────────────────── HubSpot ─────────────────────────────
  {
    slug: "hubspot",
    name: "HubSpot",
    website: "hubspot.com",
    category: "CRM",
    origin: "curated",
    updatedAt: REVIEWED,
    summary:
      "Free developer account and self-serve app. The catch is an install cap: apps on the current developer platform can be installed in at most 25 accounts until they're listed in the Marketplace. Listing requires 3 active, unaffiliated installs plus a manual review.",
    difficulty: { score: 3, label: "Moderate", why: "Easy to start. Scale beyond 25 customers is gated by Marketplace listing." },
    time: { activeEffort: "45–90 min", approvalWait: "None up to 25 installs · Marketplace review: not published", evidence: src("hs-limits", "hs-listing") },
    quickStart: {
      canStartToday: true,
      detail: "Create a free developer account and test account, then install your app there immediately.",
      evidence: src("hs-limits"),
    },
    stages: [
      { name: "Developer test accounts", audience: "Your test portals (don't count toward the cap)", unlockedBy: "Creating the app", evidence: src("hs-limits") },
      { name: "Unlisted", audience: "Up to 25 customer accounts", unlockedBy: "Marketplace-distribution app, not yet listed", evidence: src("hs-limits") },
      { name: "Marketplace listed", audience: "Unlimited installs", unlockedBy: "≥3 active unaffiliated installs + manual review", evidence: src("hs-listing") },
    ],
    requirements: [
      { item: "HubSpot developer account", when: "always", detail: "Free.", evidence: inf() },
      { item: "OAuth as the only auth method", when: "conditional", detail: "For Marketplace listing.", evidence: src("hs-listing") },
      { item: "3 active installs in unaffiliated production accounts", when: "conditional", detail: "Activity within the last 30 days, before you can submit the listing.", evidence: src("hs-listing") },
      { item: "Minimal scopes", when: "always", detail: "Listing reviewers reject unused scopes.", evidence: src("hs-listing") },
    ],
    steps: [
      { title: "Create a developer account and a test account", owner: "you", detail: "developers.hubspot.com", link: "https://developers.hubspot.com/", eta: "10 min", evidence: inf() },
      { title: "Create the app (developer platform project)", owner: "agent", detail: "On the 2025.2 platform, apps are defined as projects (HubSpot CLI). The agent can scaffold the app config with scopes and the Composio redirect URL. You run the upload with your CLI auth.", eta: "20 min", evidence: inf("Platform version 2025.2 per HubSpot changelog. Exact CLI commands not verified by us.") },
      { title: "Add redirect URL and scopes", owner: "agent", detail: `Redirect: ${COMPOSIO_REDIRECT_URI}`, eta: "5 min", evidence: src("composio-custom") },
      { title: "Install into your test account via Composio", owner: "you", detail: "Confirm the token works.", eta: "10 min", evidence: inf() },
      { title: "Get 3 real customers active, then submit listing", owner: "you", detail: "Only needed before customer #26.", eta: "Varies", evidence: src("hs-listing") },
      { title: "Marketplace review", owner: "provider", detail: "Manual review by HubSpot's Ecosystem Quality team.", eta: "Not published", evidence: src("hs-listing") },
    ],
    blockers: [
      { issue: "26th customer can't install", workaround: "The 25-install cap applies to apps created or migrated on platform 2025.2+. Plan the listing early.", evidence: src("hs-limits") },
      { issue: "Can't submit listing: not enough active installs", workaround: "You need 3 unaffiliated production accounts with real API activity in the last 30 days.", evidence: src("hs-listing") },
    ],
    scopes: [{ name: "crm.objects.contacts.read/write etc.", tier: "basic", note: "No per-scope review, but unused scopes block listing." }],
    composio,
    sources: [
      { id: "hs-limits", title: "HubSpot changelog: New marketplace distribution app install limits", url: "https://developers.hubspot.com/changelog/new-marketplace-distribution-app-install-limits", kind: "official" },
      { id: "hs-listing", title: "HubSpot: App Marketplace listing requirements", url: "https://developers.hubspot.com/docs/apps/developer-platform/list-apps/listing-your-app/app-marketplace-listing-requirements", kind: "official" },
      composioSource,
    ],
    uncertainties: ["HubSpot doesn't publish review turnaround.", "Install thresholds have changed before; recheck before planning."],
    verification: [],
  },

  // ───────────────────────────── Notion ─────────────────────────────
  {
    slug: "notion",
    name: "Notion",
    website: "notion.com",
    category: "Productivity",
    origin: "curated",
    updatedAt: REVIEWED,
    summary:
      "A public (OAuth) integration works for any workspace as soon as you create it. A security review is only needed for a Marketplace listing. One choice is permanent: the installation scope.",
    difficulty: { score: 2, label: "Easy", why: "Self-serve. Review is only needed to be listed." },
    time: { activeEffort: "15–30 min", approvalWait: "None unlisted · Marketplace security review: not published", evidence: src("notion-public") },
    quickStart: { canStartToday: true, detail: "Unlisted public integrations can be used without review.", evidence: src("notion-public") },
    stages: [
      { name: "Unlisted public integration", audience: "Any workspace that installs via your OAuth link", unlockedBy: "Creating it with 'Any workspace' scope", evidence: src("notion-public") },
      { name: "Marketplace", audience: "Discoverable listing", unlockedBy: "Notion security review", evidence: src("notion-public", "notion-marketplace") },
    ],
    requirements: [
      { item: "Installation scope = 'Any workspace'", when: "always", detail: "Permanent. 'Selected workspaces only' can never be listed, and you'd have to create a new integration.", evidence: src("notion-public") },
      { item: "Company/website/privacy/terms details", when: "conditional", detail: "Requested on the integration form for public integrations.", evidence: inf("Seen in older Notion forms; confirm in the current Creator dashboard.") },
    ],
    steps: [
      { title: "Create a public integration", owner: "you", detail: "notion.so/profile/integrations → New → Public. Choose 'Any workspace'.", link: "https://www.notion.so/profile/integrations", eta: "5 min", evidence: src("notion-public") },
      { title: "Add redirect URI and pick capabilities", owner: "agent", detail: `Redirect: ${COMPOSIO_REDIRECT_URI}. Enable only read/update/insert as needed.`, eta: "3 min", evidence: src("composio-notion") },
      { title: "Copy client ID/secret to Composio", owner: "agent", detail: "Configuration tab.", eta: "2 min", evidence: src("notion-public") },
      { title: "Test: connect and share pages", owner: "you", detail: "During consent the user picks which pages your integration can see.", eta: "5 min", evidence: inf() },
    ],
    blockers: [
      { issue: "Agent can't find any pages after connecting", workaround: "Users must select pages during OAuth. Tell them to share the right parent page.", evidence: inf() },
      { issue: "Chose 'Selected workspaces only' and now want a listing", workaround: "Not changeable. Create a new integration.", evidence: src("notion-public") },
    ],
    scopes: [{ name: "Capabilities: read / update / insert content, user info", tier: "basic", note: "No per-capability review." }],
    composio,
    sources: [
      { id: "notion-public", title: "Notion Developers: Public connections", url: "https://developers.notion.com/guides/get-started/public-connections", kind: "official" },
      { id: "notion-marketplace", title: "Notion Developers: Marketplace listing", url: "https://developers.notion.com/guides/get-started/marketplace-listing", kind: "official" },
      { id: "composio-notion", title: "Composio: Notion OAuth2 credentials guide", url: "https://composio.dev/auth/notion", kind: "composio" },
      composioSource,
    ],
    uncertainties: ["Marketplace security review timeline not published."],
    verification: [],
  },

  // ───────────────────────────── LinkedIn ─────────────────────────────
  {
    slug: "linkedin",
    name: "LinkedIn",
    website: "linkedin.com",
    category: "Social",
    origin: "curated",
    updatedAt: REVIEWED,
    summary:
      "Sign-in and posting as a member are self-serve and instant. Anything involving company Pages (posting as an org, reading analytics) needs Community Management API approval, which is only granted to registered legal organizations.",
    difficulty: { score: 4, label: "Gated", why: "Valuable scopes sit behind a vetted product program." },
    time: { activeEffort: "20–40 min", approvalWait: "Self-serve products: instant · Community Management: vetting, then Development → Standard tier upgrade", evidence: src("li-cm") },
    quickStart: { canStartToday: true, detail: "'Sign In with LinkedIn (OpenID Connect)' and 'Share on LinkedIn' are added from the Products tab without review.", evidence: src("li-thirdparty") },
    stages: [
      { name: "Self-serve products", audience: "Any member", unlockedBy: "Adding the product in the app's Products tab", evidence: src("li-thirdparty") },
      { name: "Community Management, Development tier", audience: "Limited, for building and testing", unlockedBy: "Application + org vetting", evidence: src("li-cm") },
      { name: "Community Management, Standard tier", audience: "Production", unlockedBy: "Separate request + screen recording of each use case", evidence: src("li-thirdparty") },
    ],
    requirements: [
      { item: "A LinkedIn Company Page", when: "always", detail: "Apps are associated with a Page. A Page super admin must verify the app.", evidence: src("li-cm") },
      { item: "Registered legal organization + work email", when: "conditional", detail: "Community Management only. Personal emails fail vetting.", evidence: src("li-cm") },
    ],
    steps: [
      { title: "Create the app and associate your Company Page", owner: "you", detail: "linkedin.com/developers/apps → Create app.", link: "https://www.linkedin.com/developers/apps", eta: "10 min", evidence: inf() },
      { title: "Have a Page super admin verify the app", owner: "you", detail: "Send them the verification link from the Settings tab.", eta: "Depends on admin", evidence: src("li-cm") },
      { title: "Add self-serve products", owner: "you", detail: "Products tab → Sign In with LinkedIn using OpenID Connect, Share on LinkedIn.", eta: "2 min", evidence: src("li-thirdparty") },
      { title: "Add redirect URL and copy credentials to Composio", owner: "agent", detail: `Auth tab → Authorized redirect URLs: ${COMPOSIO_REDIRECT_URI}`, eta: "3 min", evidence: src("composio-custom") },
      { title: "(If needed) Apply for Community Management API", owner: "provider", detail: "The agent drafts the use-case description. LinkedIn vets your organization.", eta: "Not published", evidence: src("li-cm") },
    ],
    blockers: [
      { issue: "Old scopes (r_liteprofile, r_emailaddress) fail", workaround: "Use openid, profile, email (OpenID Connect).", evidence: src("li-thirdparty") },
      { issue: "Community Management access denied", workaround: "Apply from a company email for a registered entity with a clear commercial use case. Individuals generally can't get it.", evidence: src("li-cm") },
    ],
    scopes: [
      { name: "openid, profile, email", tier: "basic", note: "Sign In with LinkedIn (OIDC)." },
      { name: "w_member_social", tier: "basic", note: "Post as the member (Share on LinkedIn)." },
      { name: "w_organization_social, r_organization_social", tier: "review", note: "Community Management API." },
    ],
    composio,
    sources: [
      { id: "li-cm", title: "Microsoft Learn: LinkedIn Community Management app review", url: "https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review", kind: "official" },
      { id: "li-thirdparty", title: "bundle.social: LinkedIn API permissions (third-party, Aug 2026)", url: "https://bundle.social/blog/linkedin-api-permissions", kind: "third-party" },
      composioSource,
    ],
    uncertainties: ["Development → Standard tier details come from a third-party guide.", "LinkedIn doesn't publish vetting timelines."],
    verification: [],
  },

  // ───────────────────────────── X (Twitter) ─────────────────────────────
  {
    slug: "x",
    name: "X (Twitter)",
    website: "x.com",
    category: "Social",
    origin: "curated",
    updatedAt: REVIEWED,
    summary:
      "No approval queue, but access is paid. New developers are on pay-per-use pricing (legacy Basic/Pro tiers are closed to new sign-ups), so you need billing set up before your agent can do much.",
    difficulty: { score: 3, label: "Paid", why: "Setup is self-serve. The barrier is cost and pricing churn, not review." },
    time: { activeEffort: "30–60 min", approvalWait: "None (developer account + billing)", evidence: inf("Third-party pricing sources only.") },
    quickStart: { canStartToday: true, detail: "You can create the app and OAuth 2.0 settings immediately. API calls consume paid credits.", evidence: src("x-pricing") },
    stages: [
      { name: "Developer account + app", audience: "You", unlockedBy: "Agreeing to developer terms, describing your use case", evidence: inf() },
      { name: "Production use", audience: "Your users", unlockedBy: "Buying credits (pay-per-use) or Enterprise", evidence: src("x-pricing") },
    ],
    requirements: [
      { item: "X developer account", when: "always", detail: "developer.x.com", evidence: inf() },
      { item: "Billing / prepaid credits", when: "always", detail: "Per-call pricing for reads and writes. Rates have changed often in 2025–26.", evidence: src("x-pricing") },
    ],
    steps: [
      { title: "Sign up at the developer portal and create an app", owner: "you", detail: "developer.x.com → Projects & Apps.", link: "https://developer.x.com/", eta: "15 min", evidence: inf() },
      { title: "Set up User authentication settings (OAuth 2.0)", owner: "agent", detail: `Type: Web App. Callback: ${COMPOSIO_REDIRECT_URI}. Permissions: Read/Write as needed.`, eta: "5 min", evidence: inf() },
      { title: "Buy credits / set a spend cap", owner: "you", detail: "Estimate calls per user per day before choosing a budget.", eta: "10 min", evidence: src("x-pricing") },
      { title: "Copy OAuth 2.0 client ID/secret into Composio", owner: "agent", detail: "Not the API key/secret (OAuth 1.0a).", eta: "2 min", evidence: inf() },
    ],
    blockers: [
      { issue: "Costs scale per post read/created", workaround: "Model the cost per active user before launch. Cache reads.", evidence: src("x-pricing") },
      { issue: "Confusing OAuth 1.0a vs 2.0 credentials", workaround: "Composio needs the OAuth 2.0 Client ID/Secret from 'User authentication settings'.", evidence: inf() },
    ],
    scopes: [{ name: "tweet.read, tweet.write, users.read, offline.access", tier: "paid", note: "No review. Usage is billed." }],
    composio,
    sources: [
      { id: "x-pricing", title: "postproxy.dev: X API pricing in 2026 (third-party)", url: "https://www.postproxy.dev/blog/x-api-pricing-2026/", kind: "third-party" },
      composioSource,
    ],
    uncertainties: ["Exact per-call prices conflict across sources. Check developer.x.com before budgeting.", "We didn't create an X developer app."],
    verification: [],
  },

  // ───────────────────────────── Salesforce ─────────────────────────────
  {
    slug: "salesforce",
    name: "Salesforce",
    website: "salesforce.com",
    category: "CRM",
    origin: "curated",
    updatedAt: REVIEWED,
    summary:
      "Since Spring '26, new Connected Apps are restricted and External Client Apps (ECAs) are the path. The trap is that a 'Local' ECA only works for users in the org that created it. Serving your customers' orgs means packaging the ECA or having each customer's admin deploy it.",
    difficulty: { score: 4, label: "Involved", why: "Multi-org distribution requires packaging or per-customer admin work." },
    time: { activeEffort: "30–60 min (own org) · several hours to package for other orgs", approvalWait: "None for OAuth itself · AppExchange security review only if you list", evidence: src("sf-oauth", "sf-nango") },
    quickStart: { canStartToday: true, detail: "Create a free Developer Edition org and a Local ECA. It works for users in that org right away.", evidence: src("sf-nango") },
    stages: [
      { name: "Local ECA", audience: "Users of the org where it was created", unlockedBy: "Creating the ECA", evidence: src("sf-nango") },
      { name: "Customer orgs", audience: "Other Salesforce orgs", unlockedBy: "Packaged ECA (2GP) installed in each org, or admin-deployed metadata", evidence: src("sf-nango", "sf-unified") },
    ],
    requirements: [
      { item: "Salesforce org (free Developer Edition works)", when: "always", detail: "developer.salesforce.com/signup", evidence: inf() },
      { item: "Packaging (2GP) or customer-admin deployment", when: "conditional", detail: "To serve users outside your org.", evidence: src("sf-nango", "sf-unified") },
    ],
    steps: [
      { title: "Sign up for a Developer Edition org", owner: "you", detail: "Free.", link: "https://developer.salesforce.com/signup", eta: "10 min", evidence: inf() },
      { title: "Setup → External Client App Manager → New", owner: "you", detail: "Enable OAuth. Scopes: api, refresh_token. Callback: Composio redirect URI.", eta: "10 min", evidence: src("sf-oauth") },
      { title: "Copy consumer key/secret into Composio", owner: "agent", detail: "Settings → OAuth settings → Consumer Key and Secret.", eta: "3 min", evidence: src("composio-custom") },
      { title: "Wait for OAuth settings to propagate, then test", owner: "provider", detail: "Changes may take a few minutes to take effect.", eta: "~2–10 min", evidence: inf("Commonly reported; not verified by us.") },
      { title: "Package the ECA for customer orgs", owner: "you", detail: "Second-generation managed package, or give customer admins deployable metadata.", eta: "Hours", evidence: src("sf-nango", "sf-unified") },
    ],
    blockers: [
      { issue: "OAUTH_APP_ACCESS_DENIED / app not found from a customer org", workaround: "Your ECA is Local. Package it or deploy it to the customer's org.", evidence: src("sf-nango") },
      { issue: "Tutorials say 'create a Connected App' but the option is gone", workaround: "Connected App creation is restricted from Spring '26. Use External Client Apps, or contact Salesforce Support.", evidence: src("sf-oauth") },
      { issue: "Customer's org uses My Domain / sandbox login URL", workaround: "Use the customer's instance URL (test.salesforce.com for sandboxes) in the Composio auth config.", evidence: src("composio-custom") },
    ],
    scopes: [{ name: "api, refresh_token, offline_access", tier: "basic", note: "No review. Admin policies in each org can restrict users." }],
    composio,
    sources: [
      { id: "sf-oauth", title: "Salesforce: Authorization through External Client Apps or Connected Apps", url: "https://developer.salesforce.com/docs/platform/api-rest/guide/intro-oauth-and-connected-apps.html", kind: "official" },
      { id: "sf-nango", title: "Nango: Salesforce OAuth app setup (Local vs Packaged ECA)", url: "https://nango.dev/docs/api-integrations/salesforce/salesforce-api-oauth-app-setup", kind: "third-party" },
      { id: "sf-unified", title: "Unified.to: Salesforce external client apps on multiple organizations", url: "https://unified.to/blog/salesforce_external_client_apps_on_multiple_organizations.md", kind: "third-party" },
      composioSource,
    ],
    uncertainties: ["The Local vs Packaged behaviour is from third-party sources and a forum report, not Salesforce docs we read directly.", "Propagation delay not measured."],
    verification: [],
  },
];

export const curatedGuides: Guide[] = raw.map((g) => Guide.parse(g));
