import type { ForgejoProviderTypes } from "../provider-types.ts";
import {
  type OperationOptions,
  requireIdentity,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type {
  CreateReleaseInput,
  ReleaseData,
  UpdateReleaseInput,
} from "../../../fluent-api/adapter-contract/optional/releases.ts";

import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import { requestForgejo, requestForgejoBody } from "../transport/response/mod.ts";
import {
  type AnyForgejoRelease,
  isReleasePayload,
  optionalIdentity,
  parsePositiveInt64,
} from "./validate-payload.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import { normalizeForgejoRelease } from "./normalize.ts";

/** Create one release, optionally creating its tag at the supplied target. */
export async function createForgejoRelease<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  input: CreateReleaseInput,
  options: OperationOptions = {},
): Promise<ReleaseData<"forgejo", TVersion, ForgejoProviderTypes>> {
  const operation = { universal: "createRelease", native: "repoCreateRelease" } as const;
  const tagName = requireIdentity(input.tagName, "release tag name");
  const name = optionalIdentity(input.name, "release name");
  const target = optionalIdentity(input.target, "release target");
  const client = await context.client();
  const payload = await requestForgejoBody<AnyForgejoRelease, TVersion>(
    context,
    operation,
    () =>
      client.repoCreateRelease(
        {
          path: repositoryPath(repository),
          body: {
            mediaType: "application/json",
            value: {
              tag_name: tagName,
              ...(name === undefined ? {} : { name }),
              ...(input.description === undefined ? {} : { body: input.description }),
              ...(input.draft === undefined ? {} : { draft: input.draft }),
              ...(input.prerelease === undefined ? {} : { prerelease: input.prerelease }),
              ...(target === undefined ? {} : { target_commitish: target }),
            },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isReleasePayload,
  );
  return normalizeForgejoRelease(client, payload);
}

/** Update only fields in the shared release contract. */
export async function updateForgejoRelease<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  release: ReleaseData<"forgejo", TVersion, ForgejoProviderTypes>,
  input: UpdateReleaseInput,
  options: OperationOptions = {},
): Promise<ReleaseData<"forgejo", TVersion, ForgejoProviderTypes>> {
  const operation = { universal: "updateRelease", native: "repoEditRelease" } as const;
  if (
    input.name === undefined && input.description === undefined && input.draft === undefined &&
    input.prerelease === undefined
  ) {
    throw new TypeError("release update requires at least one changed field");
  }
  const name = optionalIdentity(input.name, "release name");
  const client = await context.client();
  const payload = await requestForgejoBody<AnyForgejoRelease, TVersion>(
    context,
    operation,
    () =>
      client.repoEditRelease(
        {
          path: {
            ...repositoryPath(repository),
            id: parsePositiveInt64(release.id, "release id"),
          },
          body: {
            mediaType: "application/json",
            value: {
              ...(name === undefined ? {} : { name }),
              ...(input.description === undefined ? {} : { body: input.description }),
              ...(input.draft === undefined ? {} : { draft: input.draft }),
              ...(input.prerelease === undefined ? {} : { prerelease: input.prerelease }),
            },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isReleasePayload,
  );
  return normalizeForgejoRelease(client, payload);
}

/** Delete one known release directly without a preflight lookup. */
export async function deleteForgejoRelease<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  release: ReleaseData<"forgejo", TVersion, ForgejoProviderTypes>,
  options: OperationOptions = {},
): Promise<void> {
  const operation = { universal: "deleteRelease", native: "repoDeleteRelease" } as const;
  const client = await context.client();
  await requestForgejo(
    context,
    operation,
    () =>
      client.repoDeleteRelease(
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
}
