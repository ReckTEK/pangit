import type {
  CommitData,
  CommitFacets,
  CommitFileData,
} from "../../../fluent-api/adapter-contract/commits.ts";

import {
  createForgejoEntityNative,
  type ForgejoClient,
  type ForgejoEntityPayload,
  type ForgejoVersion,
} from "../native/ForgejoEntityNative.ts";

import {
  isRecord,
  optionalNonNegativeInteger,
  optionalText,
  requiredBoolean,
  requiredText,
} from "./validate-payload.ts";

/** Normalize one exact generated commit payload while exposing only requested expensive facets. */
export function normalizeForgejoCommit<TVersion extends ForgejoVersion>(
  client: ForgejoClient<TVersion>,
  commit: ForgejoEntityPayload<TVersion, "commit">,
  facets: CommitFacets = {},
): CommitData<"forgejo", TVersion> {
  const sha = requiredText(commit.sha, "commit SHA");
  if (!isRecord(commit.commit) || typeof commit.commit.message !== "string") {
    throw new TypeError(`commit ${sha} has no message`);
  }
  const parents = commit.parents === undefined
    ? []
    : commit.parents.map((parent) => requiredText(parent.sha, `commit ${sha} parent SHA`));
  const files = facets.files === true ? normalizeCommitFiles(commit.files, sha) : undefined;
  const stats = facets.stats === true ? normalizeCommitStats(commit.stats, sha) : undefined;
  const verified = facets.verification === true
    ? requiredBoolean(commit.commit.verification?.verified, `commit ${sha} verification`)
    : undefined;
  const url = optionalText(commit.html_url) ?? optionalText(commit.url);
  const author = normalizeActor(commit.commit.author);
  const committer = normalizeActor(commit.commit.committer);
  return Object.freeze({
    sha,
    message: commit.commit.message,
    ...(url === undefined ? {} : { url }),
    ...(author === undefined ? {} : { author }),
    ...(committer === undefined ? {} : { committer }),
    parents: Object.freeze(parents),
    ...(files === undefined ? {} : { files, changedFiles: files.length }),
    ...(stats === undefined ? {} : stats),
    ...(verified === undefined ? {} : { verified }),
    native: createForgejoEntityNative("commit", client, commit),
  });
}

function normalizeCommitFiles(value: unknown, sha: string): readonly CommitFileData[] {
  if (!Array.isArray(value)) throw new TypeError(`commit ${sha} has no requested file data`);
  return Object.freeze(value.map((file) => {
    if (!isRecord(file)) throw new TypeError(`commit ${sha} has malformed file data`);
    const path = requiredText(file.filename, `commit ${sha} changed file path`);
    return Object.freeze({
      path,
      ...(optionalText(file.status) === undefined ? {} : { status: optionalText(file.status) }),
    });
  }));
}

function normalizeCommitStats(
  value: unknown,
  sha: string,
): { readonly additions?: number; readonly deletions?: number } {
  if (!isRecord(value)) throw new TypeError(`commit ${sha} has no requested statistics`);
  const additions = optionalNonNegativeInteger(value.additions);
  const deletions = optionalNonNegativeInteger(value.deletions);
  if (value.additions !== undefined && additions === undefined) {
    throw new TypeError(`commit ${sha} has invalid additions`);
  }
  if (value.deletions !== undefined && deletions === undefined) {
    throw new TypeError(`commit ${sha} has invalid deletions`);
  }
  return Object.freeze({
    ...(additions === undefined ? {} : { additions }),
    ...(deletions === undefined ? {} : { deletions }),
  });
}

function normalizeActor(value: unknown) {
  if (!isRecord(value)) return undefined;
  const name = optionalText(value.name);
  const email = optionalText(value.email);
  const date = optionalText(value.date);
  if (name === undefined && email === undefined && date === undefined) return undefined;
  return Object.freeze({
    ...(name === undefined ? {} : { name }),
    ...(email === undefined ? {} : { email }),
    ...(date === undefined ? {} : { date }),
  });
}
