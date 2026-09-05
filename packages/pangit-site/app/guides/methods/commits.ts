import type * as api from "@recktek/pangit/api";
import type { MethodDescriptions } from "../mod.ts";

export const commits = {
  title: "repo.commits",
  source: "fluent-api/capabilities/RepositoryCommits.ts",
  methods: {
    "list":
      "list(options?) \u2192 Page<Commit>. Options: ref, since, until, excluding, files, stats, verification, limit, cursor, signal.",
    "get":
      "get(sha, options?) \u2192 Commit. Fetch one commit; opt into files, stats, or verification.",
    "getMany":
      "getMany(shas, options?) \u2192 readonly Commit[]. Preserve input order. Options add maxItems and concurrency to the commit facets; default ceiling is 100 inputs and concurrency never exceeds 4.",
    "compare":
      "compare(base, head) \u2192 operation. Call execute({ signal? }) for CommitComparisonResult, or select a supported provider output extension.",
    "files":
      "files(sha, options?) \u2192 readonly CommitFileData[]. Return paths and available diff statistics.",
    "mergeBases":
      "mergeBases(left, right, { maxItems, maxRequests, concurrency?, signal? }) \u2192 { commits, complete: true }. Require explicit inspection and request ceilings.",
    "countReachable":
      "countReachable(include, exclude?, options?) \u2192 number. Count commits reachable from include, optionally excluding those reachable from exclude.",
    "findRefs":
      "findRefs(sha, { kinds, match, limit?, cursor?, maxItems?, concurrency?, maxCommitsPerRef?, signal? }) \u2192 Page<CommitRefData>. Kinds are branch/tag; match is head/contains. Contains requires maxCommitsPerRef.",
    "contributors":
      "contributors(options) \u2192 ScanPage<ContributorData>. Aggregate one bounded history slice. Supply at least maxItems, since, or until; ref, limit, cursor, concurrency, and signal are also accepted.",
  } satisfies MethodDescriptions<api.RepositoryCommits<"gitea", "1.27.2">>,
};
