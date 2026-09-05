import type { ForgejoProviderTypes } from "../provider-types.ts";
import type { CommitFileData } from "../../../fluent-api/adapter-contract/commits.ts";

import { requirePositiveInteger } from "../../../fluent-api/adapter-contract/operation-options.ts";

import {
  createPage,
  type Page,
  type ResolvedPageRequest,
} from "../../../fluent-api/adapter-contract/pagination.ts";
import type { PullRequestData } from "../../../fluent-api/adapter-contract/pull-requests.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import {
  decodeForgejoPageCursor,
  forgejoPagination,
  requestForgejo,
} from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import {
  optionalNonNegativeInteger,
  optionalText,
  requireChangedFileArray,
  requiredText,
} from "./validate-payload.ts";
import type { AnyForgejoChangedFile } from "./payload-types.ts";

/** Read exactly one page of files changed by a pull request. */
export async function listForgejoPullRequestFiles<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  pullRequest: PullRequestData<"forgejo", TVersion, ForgejoProviderTypes>,
  request: ResolvedPageRequest,
): Promise<Page<CommitFileData>> {
  const operation = {
    universal: "listPullRequestFiles",
    native: "repoGetPullRequestFiles",
  } as const;
  const client = await context.client();
  const cursor = decodeForgejoPageCursor(request.cursor, {
    version: context.version,
    operation,
  });
  const limit = cursor.effectiveLimit ?? request.limit;
  const response = await requestForgejo(
    context,
    operation,
    () =>
      client.repoGetPullRequestFiles(
        {
          path: {
            ...repositoryPath(repository),
            index: requirePositiveInteger(pullRequest.number, "pull-request number"),
          },
          query: { page: cursor.page, limit },
        },
        requestOptions(request.signal),
      ),
    request.signal,
  );
  const payloads = requireChangedFileArray(context, operation, response);
  return createPage(
    payloads.map(normalizeChangedFile),
    forgejoPagination(
      context,
      operation,
      response,
      cursor,
      limit,
      payloads.length,
    ),
  );
}

function normalizeChangedFile(file: AnyForgejoChangedFile): CommitFileData {
  const previousPath = optionalText(file.previous_filename);
  const status = optionalText(file.status);
  const additions = optionalNonNegativeInteger(file.additions, "changed-file additions");
  const deletions = optionalNonNegativeInteger(file.deletions, "changed-file deletions");
  const changes = optionalNonNegativeInteger(file.changes, "changed-file changes");
  return Object.freeze({
    path: requiredText(file.filename, "changed-file path"),
    ...(previousPath === undefined ? {} : { previousPath }),
    ...(status === undefined ? {} : { status }),
    ...(additions === undefined ? {} : { additions }),
    ...(deletions === undefined ? {} : { deletions }),
    ...(changes === undefined ? {} : { changes }),
  });
}
