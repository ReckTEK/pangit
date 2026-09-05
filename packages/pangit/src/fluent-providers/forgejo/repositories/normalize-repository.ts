import type { ForgejoProviderTypes } from "../provider-types.ts";
import type {
  RepositoryData,
  RepositoryParentData,
} from "../../../fluent-api/adapter-contract/repositories.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoClient, ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import {
  createForgejoRepositoryNative,
  type ForgejoRepositoryPayload,
} from "../native/ForgejoRepositoryNative.ts";

import { type AnyForgejoRepository, optionalText, requiredText } from "./validate-payload.ts";

/** Normalize shared repository fields while retaining the exact generated payload. */
export function normalizeForgejoRepository<TVersion extends ForgejoVersion>(
  _context: ForgejoAdapterContext<TVersion>,
  client: ForgejoClient<TVersion>,
  repository: AnyForgejoRepository,
): RepositoryData<"forgejo", TVersion, ForgejoProviderTypes> {
  const name = requiredText(repository.name, "repository name");
  const fullName = optionalText(repository.full_name);
  const owner = optionalText(repository.owner?.login) ?? fullName?.split("/")[0];
  if (owner === undefined || owner.length === 0) {
    throw new TypeError(`repository ${name} has no owner`);
  }
  const parent = repository.parent == null
    ? undefined
    : normalizeParent(repository.parent as AnyForgejoRepository);

  return Object.freeze({
    id: requiredText(repository.id, `repository ${owner}/${name} id`),
    owner,
    name,
    fullName: fullName ?? `${owner}/${name}`,
    ...(optionalText(repository.description) === undefined
      ? {}
      : { description: optionalText(repository.description) }),
    ...(optionalText(repository.default_branch) === undefined
      ? {}
      : { defaultBranch: optionalText(repository.default_branch) }),
    ...(typeof repository.private === "boolean" ? { private: repository.private } : {}),
    ...(optionalText(repository.html_url) === undefined
      ? {}
      : { url: optionalText(repository.html_url) }),
    ...(parent === undefined ? {} : { parent }),
    native: createForgejoRepositoryNative({
      client,
      repository: repository as ForgejoRepositoryPayload<TVersion>,
    }),
  });
}

function normalizeParent(
  repository: AnyForgejoRepository,
): RepositoryParentData<"forgejo"> {
  const name = requiredText(repository.name, "fork parent repository name");
  const fullName = optionalText(repository.full_name);
  const owner = optionalText(repository.owner?.login) ?? fullName?.split("/")[0];
  if (owner === undefined || owner.length === 0) {
    throw new TypeError(`fork parent repository ${name} has no owner`);
  }
  const id = optionalText(repository.id);
  return Object.freeze({
    provider: "forgejo",
    ...(id === undefined ? {} : { id }),
    owner,
    name,
    fullName: fullName ?? `${owner}/${name}`,
  });
}
