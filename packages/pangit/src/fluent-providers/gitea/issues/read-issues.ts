import type { GiteaProviderTypes } from "../provider-types.ts";
import type {
  IssueData,
  ListIssuesRequest,
} from "../../../fluent-api/adapter-contract/optional/issues.ts";
import {
  type OperationOptions,
  requireIdentity,
  requirePositiveInteger,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import { createPage, type Page } from "../../../fluent-api/adapter-contract/pagination.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import {
  decodeGiteaPageCursor,
  giteaPagination,
  requestGitea,
  requestGiteaBody,
} from "../transport/response/mod.ts";
import {
  type AnyGiteaIssue,
  isIssuePayload,
  optionalIdentity,
  requireIssueArray,
} from "./validate-payload.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import { normalizeGiteaIssue } from "./normalize.ts";

/** Read exactly one provider page containing issues, never pull requests. */
export async function listGiteaIssues<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  request: ListIssuesRequest,
): Promise<Page<IssueData<"gitea", TVersion, GiteaProviderTypes>>> {
  const operation = { universal: "listIssues", native: "issueListIssues" } as const;
  const client = await context.client();
  const cursor = decodeGiteaPageCursor(request.cursor, { version: context.version, operation });
  const limit = cursor.effectiveLimit ?? request.limit;
  const state = request.state;
  const query = optionalIdentity(request.query, "issue query");
  const labels = request.labels?.map((label) => requireIdentity(label, "issue label"));
  const response = await requestGitea(
    context,
    operation,
    () =>
      client.issueListIssues(
        {
          path: repositoryPath(repository),
          query: {
            page: cursor.page,
            limit,
            type: "issues",
            ...(state === undefined ? {} : { state }),
            ...(query === undefined ? {} : { q: query }),
            ...(labels === undefined || labels.length === 0 ? {} : { labels: labels.join(",") }),
          },
        },
        requestOptions(request.signal),
      ),
    request.signal,
  );
  const payloads = requireIssueArray(context, operation.universal, response);
  return createPage(
    payloads.map((payload) => normalizeGiteaIssue(client, payload)),
    giteaPagination(context, operation, response, cursor, limit, payloads.length),
  );
}

/** Fetch one issue directly by repository and number. */
export async function getGiteaIssue<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  number: number,
  options: OperationOptions = {},
): Promise<IssueData<"gitea", TVersion, GiteaProviderTypes>> {
  const operation = { universal: "getIssue", native: "issueGetIssue" } as const;
  const index = requirePositiveInteger(number, "issue number");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaIssue, TVersion>(
    context,
    operation,
    () =>
      client.issueGetIssue(
        { path: { ...repositoryPath(repository), index } },
        requestOptions(options.signal),
      ),
    options.signal,
    isIssuePayload,
  );
  return normalizeGiteaIssue(client, payload);
}
