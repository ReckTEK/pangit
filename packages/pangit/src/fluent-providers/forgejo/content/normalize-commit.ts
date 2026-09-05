import type { CommitData } from "../../../fluent-api/adapter-contract/commits.ts";

import {
  createForgejoFilesResponseCommitNative,
  type ForgejoClient,
  type ForgejoFilesResponsePayload,
  type ForgejoVersion,
} from "../native/ForgejoEntityNative.ts";

import { isRecord, optionalText, requiredText } from "./validate-payload.ts";

export function normalizeFilesResponseCommit<TVersion extends ForgejoVersion>(
  client: ForgejoClient<TVersion>,
  payload: ForgejoFilesResponsePayload<TVersion>,
): CommitData<"forgejo", TVersion> {
  if (!isRecord(payload.commit)) throw new TypeError("file-change response has no commit");
  const sha = requiredText(payload.commit.sha, "file-change commit SHA");
  const message = requiredText(payload.commit.message, `file-change commit ${sha} message`);
  const parents = payload.commit.parents === undefined
    ? []
    : payload.commit.parents.map((parent) =>
      requiredText(parent.sha, `file-change commit ${sha} parent SHA`)
    );
  const verified = typeof payload.verification?.verified === "boolean"
    ? payload.verification.verified
    : undefined;
  const url = optionalText(payload.commit.html_url) ?? optionalText(payload.commit.url);
  const author = normalizeActor(payload.commit.author);
  const committer = normalizeActor(payload.commit.committer);
  return Object.freeze({
    sha,
    message,
    ...(url === undefined ? {} : { url }),
    ...(author === undefined ? {} : { author }),
    ...(committer === undefined ? {} : { committer }),
    parents: Object.freeze(parents),
    ...(verified === undefined ? {} : { verified }),
    native: createForgejoFilesResponseCommitNative(client, payload),
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
