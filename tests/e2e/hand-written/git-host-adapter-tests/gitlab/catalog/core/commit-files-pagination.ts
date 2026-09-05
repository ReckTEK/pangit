import type { GitLabE2EFixtureDriver } from "../../GitLabE2EFixtureDriver.ts";

export const runCoreCommitFilesPagination = async (f: GitLabE2EFixtureDriver) => {
  const repo = await f.project();
  const changes = Array.from({ length: 101 }, (_, i) => ({
    operation: "create" as const,
    path: `many/${String(i).padStart(3, "0")}.txt`,
    content: `file ${i}\n`,
  }));
  // Seed a commit above the portable write-batch bound to exercise read pagination.
  const commit = await f.raw("POST", `/projects/${repo.id}/repository/commits`, {
    branch: "main",
    commit_message: "Create 101 files",
    actions: changes.map((change) => ({
      action: "create",
      file_path: change.path,
      content: change.content,
    })),
  });
  const files = await f.prove("Commit files traverse both provider pages", [
    "getApiV4ProjectsIdRepositoryCommitsShaDiff",
    "getApiV4ProjectsIdRepositoryCommitsShaDiff",
  ], () => repo.commits.files(String(commit.id)));
  f.equal(
    files.map((file) => file.path).sort(),
    changes.map((change) => change.path),
    "All 101 files are returned exactly once",
  );
};
