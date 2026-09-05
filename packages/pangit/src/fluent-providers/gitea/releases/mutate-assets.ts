import type { GiteaProviderTypes } from "../provider-types.ts";
import {
  type OperationOptions,
  requireIdentity,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type {
  ReleaseAssetData,
  ReleaseData,
  UpdateReleaseAssetInput,
  UploadReleaseAssetInput,
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
} from "./validate-payload.ts";

import { normalizeGiteaReleaseAsset } from "./normalize.ts";

/** Upload one binary release asset with one direct request. */
export async function uploadGiteaReleaseAsset<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  release: ReleaseData<"gitea", TVersion, GiteaProviderTypes>,
  input: UploadReleaseAssetInput,
  options: OperationOptions = {},
): Promise<ReleaseAssetData<"gitea", TVersion, GiteaProviderTypes>> {
  const operation = {
    universal: "uploadReleaseAsset",
    native: "repoCreateReleaseAttachment",
  } as const;
  const name = requireIdentity(input.name, "release asset name");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaReleaseAsset, TVersion>(
    context,
    operation,
    () =>
      client.repoCreateReleaseAttachment(
        {
          path: {
            ...repositoryPath(repository),
            id: parsePositiveInt64(release.id, "release id"),
          },
          query: { name },
          body: { mediaType: "multipart/form-data", value: { attachment: input.data } },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isAssetPayload,
  );
  return normalizeGiteaReleaseAsset(client, payload);
}

/** Rename one known release asset directly. */
export async function updateGiteaReleaseAsset<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  release: ReleaseData<"gitea", TVersion, GiteaProviderTypes>,
  asset: ReleaseAssetData<"gitea", TVersion, GiteaProviderTypes>,
  input: UpdateReleaseAssetInput,
  options: OperationOptions = {},
): Promise<ReleaseAssetData<"gitea", TVersion, GiteaProviderTypes>> {
  const operation = {
    universal: "updateReleaseAsset",
    native: "repoEditReleaseAttachment",
  } as const;
  const name = requireIdentity(input.name, "release asset name");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaReleaseAsset, TVersion>(
    context,
    operation,
    () =>
      client.repoEditReleaseAttachment(
        {
          path: {
            ...repositoryPath(repository),
            id: parsePositiveInt64(release.id, "release id"),
            attachment_id: parsePositiveInt64(asset.id, "release asset id"),
          },
          body: { mediaType: "application/json", value: { name } },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isAssetPayload,
  );
  return normalizeGiteaReleaseAsset(client, payload);
}

/** Delete one known release asset directly without a lookup. */
export async function deleteGiteaReleaseAsset<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  release: ReleaseData<"gitea", TVersion, GiteaProviderTypes>,
  asset: ReleaseAssetData<"gitea", TVersion, GiteaProviderTypes>,
  options: OperationOptions = {},
): Promise<void> {
  const operation = {
    universal: "deleteReleaseAsset",
    native: "repoDeleteReleaseAttachment",
  } as const;
  const client = await context.client();
  await requestGitea(
    context,
    operation,
    () =>
      client.repoDeleteReleaseAttachment(
        {
          path: {
            ...repositoryPath(repository),
            id: parsePositiveInt64(release.id, "release id"),
            attachment_id: parsePositiveInt64(asset.id, "release asset id"),
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
  );
}
