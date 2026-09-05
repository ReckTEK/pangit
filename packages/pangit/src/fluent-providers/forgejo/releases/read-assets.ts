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
import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import { requestForgejo, requestForgejoBody } from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";
import {
  type AnyForgejoReleaseAsset,
  isAssetPayload,
  parsePositiveInt64,
  requireAssetArray,
} from "./validate-payload.ts";

import { normalizeForgejoReleaseAsset } from "./normalize.ts";

/**
 * Read Forgejo's single unpaged asset result and reject it above the caller's explicit ceiling.
 * Forgejo exposes no page/limit input for this endpoint in either supported generated client.
 */
export async function listForgejoReleaseAssets<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  release: ReleaseData<"forgejo", TVersion>,
  options: ListReleaseAssetsOptions,
): Promise<readonly ReleaseAssetData<"forgejo", TVersion>[]> {
  const operation = {
    universal: "listReleaseAssets",
    native: "repoListReleaseAttachments",
  } as const;
  const maxItems = requirePositiveInteger(options.maxItems, "maximum release assets");
  const client = await context.client();
  const response = await requestForgejo(
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
        provider: "forgejo",
        version: context.version,
        operation: operation.universal,
        cause: response,
      },
    );
  }
  return Object.freeze(payloads.map((payload) => normalizeForgejoReleaseAsset(client, payload)));
}

/** Fetch one release asset directly by release and asset ID. */
export async function getForgejoReleaseAsset<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  release: ReleaseData<"forgejo", TVersion>,
  id: string,
  options: OperationOptions = {},
): Promise<ReleaseAssetData<"forgejo", TVersion>> {
  const operation = {
    universal: "getReleaseAsset",
    native: "repoGetReleaseAttachment",
  } as const;
  const client = await context.client();
  const payload = await requestForgejoBody<AnyForgejoReleaseAsset, TVersion>(
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
  return normalizeForgejoReleaseAsset(client, payload);
}
