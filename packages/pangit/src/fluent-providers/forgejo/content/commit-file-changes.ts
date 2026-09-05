import type { ForgejoProviderTypes } from "../provider-types.ts";
import { ConflictError } from "../../../fluent-api/adapter-contract/errors.ts";
import type {
  CommitFileChangesInput,
  CommitFileChangesOptions,
} from "../../../fluent-api/adapter-contract/content.ts";

import type { CommitData, GitActor } from "../../../fluent-api/adapter-contract/commits.ts";
import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoFilesResponsePayload, ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import { requestForgejoBody } from "../transport/response/mod.ts";
import { requestOptions, validationContext, validationError } from "./validation.ts";

import { validateFileChanges } from "./validate-file-changes.ts";
import { FORGEJO_CONTENT_BATCH_SIZE, readOneFileBatch } from "./read-files.ts";

import { indexBatchShas } from "./read-path-metadata.ts";
import { repositoryPath } from "./paths.ts";

import { isFilesResponse } from "./validate-payload.ts";
import type { AnyForgejoFilesResponse } from "./payload-types.ts";
import { normalizeFilesResponseCommit } from "./normalize-commit.ts";

/**
 * Commit one validated file batch with one mutation after bounded source reads.
 */
export async function commitForgejoFileChanges<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  input: CommitFileChangesInput,
  options: CommitFileChangesOptions<"forgejo", ForgejoProviderTypes> = {},
): Promise<CommitData<"forgejo", TVersion, ForgejoProviderTypes>> {
  const preReadOperation = {
    universal: "commitFileChanges",
    native: "repoGetContents",
  } as const;
  const mutationOperation = {
    universal: "commitFileChanges",
    native: "repoChangeFiles",
  } as const;
  const inputContext = validationContext(context, "commitFileChanges");
  const branch = requireIdentity(input.branch, "file-change branch", inputContext);
  const newBranch = input.newBranch === undefined
    ? undefined
    : requireIdentity(input.newBranch, "new file-change branch", inputContext);
  const message = requireIdentity(input.message, "file-change commit message", inputContext);
  if (newBranch === branch) {
    throw validationError(
      context,
      "commitFileChanges",
      "new file-change branch must differ from the base branch",
    );
  }
  const changes = validateFileChanges(context, input.changes);
  if (changes.length > FORGEJO_CONTENT_BATCH_SIZE) {
    throw validationError(
      context,
      "commitFileChanges",
      `file-change batch exceeds the conservative ${FORGEJO_CONTENT_BATCH_SIZE} item limit`,
    );
  }
  const extension = options.extension;
  const author = normalizeWriteActor(context, input.author, "author");
  const committer = normalizeWriteActor(context, extension?.committer, "committer");
  const authorDate = extension?.authorDate === undefined
    ? author.date
    : requireIdentity(extension.authorDate, "author date", inputContext);
  const committerDate = extension?.committerDate === undefined
    ? committer.date
    : requireIdentity(extension.committerDate, "committer date", inputContext);
  const client = await context.client();
  const existingPaths = [
    ...new Set(
      changes.filter((change) => change.needsSha || change.operation === "upsert").map((change) =>
        change.existingPath
      ),
    ),
  ];
  let shaByPath = new Map<string, string>();
  const contentByPath = new Map<string, string>();
  if (existingPaths.length > 0) {
    const preRead = await readOneFileBatch(
      context,
      client,
      repository,
      existingPaths,
      branch,
      preReadOperation,
      options.signal,
    );
    const requiredPaths = changes.filter((change) => change.needsSha).map((change) =>
      change.existingPath
    );
    shaByPath = indexBatchShas(
      context,
      requiredPaths,
      preRead.filter((payload) => payload !== null && requiredPaths.includes(payload.path!)),
    );
    for (const payload of preRead) {
      if (payload === null) continue;
      if (typeof payload.sha === "string") shaByPath.set(payload.path!, payload.sha);
      if (payload.encoding === "base64" && typeof payload.content === "string") {
        contentByPath.set(payload.path!, payload.content);
      }
    }
    for (const change of changes) {
      if (change.operation === "move" && !contentByPath.has(change.existingPath)) {
        throw validationError(
          context,
          "commitFileChanges",
          `cannot preserve bytes for moved file ${change.existingPath}`,
        );
      }
    }
    for (const change of changes) {
      if (change.sha === undefined) continue;
      const currentSha = shaByPath.get(change.existingPath);
      if (currentSha !== change.sha) {
        throw new ConflictError(
          `file ${change.existingPath} changed since its expected SHA was read`,
          {
            provider: "forgejo",
            version: context.version,
            operation: "commitFileChanges",
          },
        );
      }
    }
  }
  const payload = await requestForgejoBody<AnyForgejoFilesResponse, TVersion>(
    context,
    mutationOperation,
    () =>
      client.repoChangeFiles(
        {
          path: repositoryPath(repository),
          body: {
            mediaType: "application/json",
            value: {
              branch,
              ...(newBranch === undefined ? {} : { new_branch: newBranch }),
              message,
              ...(author.identity === undefined ? {} : { author: author.identity }),
              ...(committer.identity === undefined ? {} : { committer: committer.identity }),
              ...(authorDate === undefined && committerDate === undefined ? {} : {
                dates: {
                  ...(authorDate === undefined ? {} : { author: authorDate }),
                  ...(committerDate === undefined ? {} : { committer: committerDate }),
                },
              }),
              ...(extension?.forceOverwriteNewBranch === undefined
                ? {}
                : { force_overwrite_new_branch: extension.forceOverwriteNewBranch }),
              ...(extension?.signoff === undefined ? {} : { signoff: extension.signoff }),
              files: changes.map((change) => {
                const sha = change.sha ?? shaByPath.get(change.existingPath);
                return {
                  operation: change.operation === "move"
                    ? "update" as const
                    : change.operation === "upsert"
                    ? (sha === undefined ? "create" as const : "update" as const)
                    : change.operation,
                  path: change.path,
                  ...(change.fromPath === undefined ? {} : { from_path: change.fromPath }),
                  ...(change.operation === "move"
                    ? { content: contentByPath.get(change.existingPath)! }
                    : change.content === undefined
                    ? {}
                    : { content: change.content }),
                  ...(sha === undefined ? {} : { sha }),
                };
              }),
            },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isFilesResponse,
  );
  return normalizeFilesResponseCommit(
    client,
    payload as ForgejoFilesResponsePayload<TVersion>,
  );
}

function normalizeWriteActor<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  actor: GitActor | undefined,
  label: "author" | "committer",
): {
  readonly identity?: { readonly name?: string; readonly email?: string };
  readonly date?: string;
} {
  if (actor === undefined) return {};
  const errorContext = validationContext(context, "commitFileChanges");
  const name = actor.name === undefined
    ? undefined
    : requireIdentity(actor.name, `${label} name`, errorContext);
  const email = actor.email === undefined
    ? undefined
    : requireIdentity(actor.email, `${label} email`, errorContext);
  const date = actor.date === undefined
    ? undefined
    : requireIdentity(actor.date, `${label} date`, errorContext);
  if (name === undefined && email === undefined && date === undefined) {
    throw validationError(
      context,
      "commitFileChanges",
      `${label} must contain a name, email, or date`,
    );
  }
  return {
    ...(name === undefined && email === undefined ? {} : {
      identity: {
        ...(name === undefined ? {} : { name }),
        ...(email === undefined ? {} : { email }),
      },
    }),
    ...(date === undefined ? {} : { date }),
  };
}
