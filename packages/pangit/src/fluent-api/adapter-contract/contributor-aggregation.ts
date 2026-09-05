import type { ContributorData, GitActor } from "./commits.ts";

/** Aggregate a history slice using the portable Git-author identity rule. */
export function aggregateContributors(
  commits: readonly { readonly author?: GitActor }[],
): readonly ContributorData[] {
  const contributors = new Map<string, { name?: string; email?: string; commits: number }>();
  for (const commit of commits) {
    const name = commit.author?.name;
    const email = commit.author?.email;
    if (name === undefined && email === undefined) continue;
    const key = email === undefined ? `name:${name}` : `email:${email.toLowerCase()}`;
    const contributor = contributors.get(key);
    if (contributor === undefined) contributors.set(key, { name, email, commits: 1 });
    else contributor.commits++;
  }
  return Object.freeze([...contributors.values()].map((contributor) => Object.freeze(contributor)));
}
