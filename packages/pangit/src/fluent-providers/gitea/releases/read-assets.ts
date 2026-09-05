import { ValidationError } from "../../../fluent-api/adapter-contract/errors.ts";
import {
  type OperationOptions,
  requirePositiveInteger,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type {
  ListReleaseAssetsOptions,
  ReleaseAssetData,
  ReleaseData,
} from "../../../fluent-api/adapter-contract/optional/releases.ts";

import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import { requestGitea, requestGiteaBody } from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";
import {
  type AnyGiteaReleaseAsset,
  isAssetPayload,
  parsePositiveInt64,
  requireAssetArray,
} from "./validate-payload.ts";

import { normalizeGiteaReleaseAsset } from "./normalize.ts";

/**
 * Read Gitea's single unpaged asset result and reject it above the caller's explicit ceiling.
 * Gitea exposes no page/limit input for this endpoint in either supported generated client.
 */
export async function listGiteaReleaseAssets<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  release: ReleaseData<"gitea", TVersion>,
  options: ListReleaseAssetsOptions,
): Promise<readonly ReleaseAssetData<"gitea", TVersion>[]> {
  const operation = {
    universal: "listReleaseAssets",
    native: "repoListReleaseAttachments",
  } as const;
  const maxItems = requirePositiveInteger(options.maxItems, "maximum release assets");
  const client = await context.client();
  const response = await requestGitea(
    context,
    operation,
    () =>
      client.repoListReleaseAttachments(
        {
          path: {
            ...repositoryPath(repository),
            id: parsePositiveInt64(release.id, "release id"),
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
  );
  const payloads = requireAssetArray(context, operation.universal, response);
  if (payloads.length > maxItems) {
    throw new ValidationError(
      `${operation.universal} returned ${payloads.length} assets, exceeding the ${maxItems} item limit`,
      {
        provider: "gitea",
        version: context.version,
        operation: operation.universal,
        cause: response,
      },
    );
  }
  return Object.freeze(payloads.map((payload) => normalizeGiteaReleaseAsset(client, payload)));
}

/** Fetch one release asset directly by release and asset ID. */
export async function getGiteaReleaseAsset<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  release: ReleaseData<"gitea", TVersion>,
  id: string,
  options: OperationOptions = {},
): Promise<ReleaseAssetData<"gitea", TVersion>> {
  const operation = {
    universal: "getReleaseAsset",
    native: "repoGetReleaseAttachment",
  } as const;
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaReleaseAsset, TVersion>(
    context,
    operation,
    () =>
      client.repoGetReleaseAttachment(
        {
          path: {
            ...repositoryPath(repository),
            id: parsePositiveInt64(release.id, "release id"),
            attachment_id: parsePositiveInt64(id, "release asset id"),
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isAssetPayload,
  );
  return normalizeGiteaReleaseAsset(client, payload);
}
