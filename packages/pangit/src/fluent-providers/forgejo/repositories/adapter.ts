import type {} from "../registration.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";

import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import { createForgejoRepository } from "./create-repository.ts";
import { deleteForgejoRepository, renameForgejoRepository } from "./mutate-repository.ts";
import {
  findForgejoRepository,
  getForgejoRepository,
  hasForgejoRepository,
} from "./get-repository.ts";

import { listForgejoRepositories } from "./list-repositories.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
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
    listRepositories: (container, request) => listForgejoRepositories(context, container, request),
    getRepository: (container, name, options) =>
      getForgejoRepository(context, container, name, options),
    findRepository: (container, name, options) =>
      findForgejoRepository(context, container, name, options),
    hasRepository: (container, name, options) =>
      hasForgejoRepository(context, container, name, options),
    createRepository: (container, name, options) =>
      createForgejoRepository(context, container, name, options),
    renameRepository: (repository, name, options) =>
      renameForgejoRepository(context, repository, name, options),
    deleteRepository: (repository, options) =>
      deleteForgejoRepository(context, repository, options),
  };
}
