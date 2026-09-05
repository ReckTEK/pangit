import type { GitLabE2EFixtureDriver } from "../../GitLabE2EFixtureDriver.ts";

export const runCoreCommits = async (f: GitLabE2EFixtureDriver) => {
  const repo = await f.project();
  const base = (await repo.branches.get("main")).sha;
  const sha = await f.commit(repo.id, "main", "history.txt", "line\n");
  const commit = await f.prove(
    "commit direct get",
    ["getApiV4ProjectsIdRepositoryCommitsSha"],
    () => repo.commits.get(sha),
  );
  f.equal(commit.parents, [base], "Commit parent graph retained");
  const facets = await repo.commits.get(sha, { stats: true, files: true, verification: true });
  f.equal(facets.files?.[0].path, "history.txt", "Optional diff facet");
  f.equal(facets.additions, 1, "Optional statistics facet");
  f.equal(facets.verified, false, "Unsigned commit verification");
  const many = await f.prove("Duplicate commit gets are deduplicated", [
    "getApiV4ProjectsIdRepositoryCommitsSha",
    "getApiV4ProjectsIdRepositoryCommitsSha",
  ], () => repo.commits.getMany([sha, base, sha]));
  f.equal(many.map((c) => c.sha), [sha, base, sha], "Batch preserves input order and duplicates");
  const comparison = await repo.commits.compare(base, sha).execute();
  f.equal(comparison.commits.map((c) => c.sha), [sha], "Compare yields exact range");
  f.equal(await repo.commits.countReachable(sha, base), 1, "Reachable difference");
  f.equal(await repo.commits.countReachable(sha), 2, "Full reachable count");
  f.equal(
    (await repo.commits.mergeBases(base, sha, { maxItems: 10, maxRequests: 10 })).commits.map((
      c,
    ) => c.sha),
    [base],
    "Merge bases complete",
  );
  const refs = await repo.commits.findRefs(sha, { kinds: ["branch"], match: "head", limit: 10 });
  f.assert(
    refs.items.some((r) => r.name === "main" && r.sha === sha),
    "Head refs resolve exact SHA",
  );
  const contributors = await repo.commits.contributors({ maxItems: 10, limit: 10 });
  f.assert(contributors.complete, "Bounded contributor slice reports completeness");
  const page = await repo.commits.list({ limit: 1 });
  f.assert(page.nextCursor, "Commit page retains continuation");
  f.equal(
    (await repo.commits.list({ cursor: page.nextCursor, limit: 1 })).items[0].sha,
    base,
    "Commit continuation",
  );
};
