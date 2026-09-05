import type { GiteaProviderTypes } from "../provider-types.ts";
import type {
  RepositoryData,
  RepositoryParentData,
} from "../../../fluent-api/adapter-contract/repositories.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaClient, GiteaVersion } from "../native/GiteaEntityNative.ts";
import {
  createGiteaRepositoryNative,
  type GiteaRepositoryPayload,
} from "../native/GiteaRepositoryNative.ts";

import { type AnyGiteaRepository, optionalText, requiredText } from "./validate-payload.ts";

/** Normalize shared repository fields while retaining the exact generated payload. */
export function normalizeGiteaRepository<TVersion extends GiteaVersion>(
  _context: GiteaAdapterContext<TVersion>,
  client: GiteaClient<TVersion>,
  repository: AnyGiteaRepository,
): RepositoryData<"gitea", TVersion, GiteaProviderTypes> {
  const name = requiredText(repository.name, "repository name");
  const fullName = optionalText(repository.full_name);
  const owner = optionalText(repository.owner?.login) ?? fullName?.split("/")[0];
  if (owner === undefined || owner.length === 0) {
    throw new TypeError(`repository ${name} has no owner`);
  }
  const parent = repository.parent === undefined
    ? undefined
    : normalizeParent(repository.parent as AnyGiteaRepository);

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
    native: createGiteaRepositoryNative({
      client,
      repository: repository as GiteaRepositoryPayload<TVersion>,
    }),
  });
}

function normalizeParent(
  repository: AnyGiteaRepository,
): RepositoryParentData<"gitea"> {
  const name = requiredText(repository.name, "fork parent repository name");
  const fullName = optionalText(repository.full_name);
  const owner = optionalText(repository.owner?.login) ?? fullName?.split("/")[0];
  if (owner === undefined || owner.length === 0) {
    throw new TypeError(`fork parent repository ${name} has no owner`);
  }
  const id = optionalText(repository.id);
  return Object.freeze({
    provider: "gitea",
    ...(id === undefined ? {} : { id }),
    owner,
    name,
    fullName: fullName ?? `${owner}/${name}`,
  });
}
