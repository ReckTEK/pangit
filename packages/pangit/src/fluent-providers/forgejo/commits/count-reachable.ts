import {
  type OperationOptions,
  requireIdentity,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import { type ForgejoOperationIdentity, requestForgejo } from "../transport/response/mod.ts";

import { repositoryPath, requestOptions } from "./request-options.ts";

import { optionalNonNegativeInteger, requireCommitArray } from "./validate-payload.ts";

import { invariant } from "./errors.ts";

/** Count `include --not exclude` from one count-only provider request. */
export async function countForgejoReachableCommits<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  include: string,
  exclude?: string,
  options: OperationOptions = {},
  operation: ForgejoOperationIdentity = {
    universal: "countReachableCommits",
    native: "repoGetAllCommits",
  },
): Promise<number> {
  const includeRef = requireIdentity(include, "included commit ref");
  const excludeRef = exclude === undefined
    ? undefined
    : requireIdentity(exclude, "excluded commit ref");
  const response = await requestForgejo(
    context,
    operation,
    async () => {
      const client = await context.client();
      return await client.repoGetAllCommits(
        {
          path: repositoryPath(repository),
          query: {
            sha: includeRef,
            ...(excludeRef === undefined ? {} : { not: excludeRef }),
            page: 1,
            limit: 1,
            files: false,
            stat: false,
            verification: false,
          },
        },
        requestOptions(options.signal),
      );
    },
    options.signal,
  );
  requireCommitArray(context, operation, response);
  const raw = response.headers.get("x-total");
  const count = raw === null ? undefined : optionalNonNegativeInteger(raw);
  if (count === undefined) {
    throw invariant(
      context,
      operation,
      "count probe returned a missing or invalid X-Total header",
      response,
    );
  }
  return count;
}
