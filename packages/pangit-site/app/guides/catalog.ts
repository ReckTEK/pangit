/** Reading order, routes, and navigation share this catalog. */
export const guides = [
  {
    slug: "getting-started",
    keywords: "quickstart setup install createClient",
    title: "Your first request",
    group: "Start here",
    summary: "Connect to your Git host and read a repository in a few lines.",
  },
  {
    slug: "authentication",
    keywords: "auth authorize login token password OTP PKCE cookie session",
    title: "Authentication",
    group: "Start here",
    summary: "Use a token, Basic credentials, or a provider-hosted OAuth login.",
  },
  {
    slug: "repositories",
    keywords: "container currentUserProfile findRepository createRepository namespace",
    title: "Repositories & owners",
    group: "Repository workflows",
    summary: "Find, create, rename, and fork repositories.",
  },
  {
    slug: "branches-tags",
    keywords: "divergence refs branch tags",
    title: "Branches & tags",
    group: "Repository workflows",
    summary: "Manage refs and measure how branches have diverged.",
  },
  {
    slug: "commits",
    keywords: "compare getMany mergeBases findRefs countReachable contributors stats verification",
    title: "Commits & history",
    group: "Repository workflows",
    summary: "Inspect changes, compare refs, and make bounded history queries.",
  },
  {
    slug: "files",
    keywords:
      "content readText readBytes readJson readBlob commitChanges directory symlink submodule",
    title: "Read & write files",
    group: "Repository workflows",
    summary: "Read text, bytes, and JSON; commit several file changes together.",
  },
  {
    slug: "pull-requests",
    keywords: "pullRequests merge requestReviewers approve comment MR",
    title: "Pull requests & reviews",
    group: "Repository workflows",
    summary: "Open a change, request feedback, and merge it.",
  },
  {
    slug: "issues",
    keywords: "setState comments issue update labels assignees",
    title: "Issues & comments",
    group: "Repository workflows",
    summary: "Create issues, inspect labels and assignees, and manage conversations.",
  },
  {
    slug: "statuses-ci",
    keywords: "statuses pipelines Actions ciRuns jobs workflows artifact",
    title: "Statuses & CI",
    group: "Automation & delivery",
    summary: "Publish check results and discover runs, jobs, and artifacts.",
  },
  {
    slug: "releases-packages",
    keywords: "registry versions upload assets download",
    title: "Releases & packages",
    group: "Automation & delivery",
    summary: "Publish release assets and inspect package versions.",
  },
  {
    slug: "webhooks-rules",
    keywords: "branchRules protection effective policy webhook events",
    title: "Webhooks & branch rules",
    group: "Automation & delivery",
    summary: "Configure repository events and supported branch policies.",
  },
  {
    slug: "pagination-errors",
    keywords: "cursor nextCursor complete abort cancel signal timeout retry exception",
    title: "Pagination & errors",
    group: "Working across providers",
    summary: "Keep work bounded, cancel requests, and handle failures deliberately.",
  },
  {
    slug: "providers",
    keywords: "Gitea Forgejo GitLab Codeberg API versions compatibility support limitations",
    title: "Provider support",
    group: "Working across providers",
    summary: "Choose an exact version and understand the limits of each implementation.",
  },
  {
    slug: "native-access",
    keywords: "native execute lazy standalone callbacks diff patch extensions",
    title: "Provider extensions",
    group: "Working across providers",
    summary: "Add provider-specific options or use the selected native client.",
  },
  {
    slug: "raw-clients",
    keywords: "GitHub Bitbucket Azure DevOps OpenAPI Fetch response headers transport generated",
    title: "Generated REST clients",
    group: "Working across providers",
    summary: "Call a provider's complete REST API with generated request and response types.",
  },
] as const;

export type GuideSlug = typeof guides[number]["slug"];
export const guideGroups = [...new Set(guides.map((guide) => guide.group))];

export function findGuide(slug: GuideSlug) {
  return guides.find((guide) => guide.slug === slug)!;
}

/** Match everyday vocabulary and API names, regardless of word order or case. */
export function searchGuides(query: string) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return guides.filter((guide) => {
    const text = `${guide.title} ${guide.summary} ${guide.group} ${guide.keywords}`.toLowerCase();
    return terms.every((term) => text.includes(term));
  });
}
