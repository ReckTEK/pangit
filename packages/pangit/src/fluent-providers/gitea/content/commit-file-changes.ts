import { ConflictError } from "../../../fluent-api/adapter-contract/errors.ts";
import type {
  CommitFileChangesInput,
  CommitFileChangesOptions,
} from "../../../fluent-api/adapter-contract/content.ts";

import type { CommitData, GitActor } from "../../../fluent-api/adapter-contract/commits.ts";
import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaFilesResponsePayload, GiteaVersion } from "../native/GiteaEntityNative.ts";
import { requestGiteaBody } from "../transport/response/mod.ts";
import { requestOptions, validationContext, validationError } from "./validation.ts";

import { validateFileChanges } from "./validate-file-changes.ts";
import { GITEA_CONTENT_BATCH_SIZE, readOneFileBatch } from "./read-files.ts";

import { indexBatchShas } from "./read-path-metadata.ts";
import { repositoryPath } from "./paths.ts";

import { isFilesResponse } from "./validate-payload.ts";
import type { AnyGiteaFilesResponse } from "./payload-types.ts";
import { normalizeFilesResponseCommit } from "./normalize-commit.ts";

/**
 * Commit one validated file batch with one mutation and at most one batch SHA pre-read.
 */
export async function commitGiteaFileChanges<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  input: CommitFileChangesInput,
  options: CommitFileChangesOptions<"gitea"> = {},
): Promise<CommitData<"gitea", TVersion>> {
  const preReadOperation = {
    universal: "commitFileChanges",
    native: "repoGetFileContentsPost",
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
  if (changes.length > GITEA_CONTENT_BATCH_SIZE) {
    throw validationError(
      context,
      "commitFileChanges",
      `file-change batch exceeds the conservative ${GITEA_CONTENT_BATCH_SIZE} item limit`,
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
      changes.filter((change) => change.needsSha).map((change) => change.existingPath),
    ),
  ];
  let shaByPath = new Map<string, string>();
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
    shaByPath = indexBatchShas(context, existingPaths, preRead);
    for (const change of changes) {
      if (change.sha === undefined) continue;
      const currentSha = shaByPath.get(change.existingPath);
      if (currentSha !== change.sha) {
        throw new ConflictError(
          `file ${change.existingPath} changed since its expected SHA was read`,
          {
            provider: "gitea",
            version: context.version,
            operation: "commitFileChanges",
          },
        );
      }
    }
  }
  const payload = await requestGiteaBody<AnyGiteaFilesResponse, TVersion>(
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
              ...(extension?.forcePush === undefined ? {} : { force_push: extension.forcePush }),
              ...(extension?.signoff === undefined ? {} : { signoff: extension.signoff }),
              files: changes.map((change) => {
                const sha = change.sha ?? shaByPath.get(change.existingPath);
                return {
                  operation: change.operation,
                  path: change.path,
                  ...(change.fromPath === undefined ? {} : { from_path: change.fromPath }),
                  ...(change.content === undefined ? {} : { content: change.content }),
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
    payload as GiteaFilesResponsePayload<TVersion>,
  );
}

function normalizeWriteActor<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
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
