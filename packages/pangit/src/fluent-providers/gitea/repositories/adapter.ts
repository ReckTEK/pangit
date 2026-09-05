import type {} from "../registration.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";

import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import { createGiteaRepository } from "./create-repository.ts";
import { deleteGiteaRepository, renameGiteaRepository } from "./mutate-repository.ts";
import { findGiteaRepository, getGiteaRepository, hasGiteaRepository } from "./get-repository.ts";

import { listGiteaRepositories } from "./list-repositories.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends GiteaVersion>(
  context: GiteaAdapterContext<V>,
): Pick<
  Adapter<V>,
  | "listRepositories"
  | "getRepository"
  | "findRepository"
  | "hasRepository"
  | "createRepository"
  | "renameRepository"
  | "deleteRepository"
> {
  return {
    listRepositories: (container, request) => listGiteaRepositories(context, container, request),
    getRepository: (container, name, options) =>
      getGiteaRepository(context, container, name, options),
    findRepository: (container, name, options) =>
      findGiteaRepository(context, container, name, options),
    hasRepository: (container, name, options) =>
      hasGiteaRepository(context, container, name, options),
    createRepository: (container, name, options) =>
      createGiteaRepository(context, container, name, options),
    renameRepository: (repository, name, options) =>
      renameGiteaRepository(context, repository, name, options),
    deleteRepository: (repository, options) => deleteGiteaRepository(context, repository, options),
  };
}
