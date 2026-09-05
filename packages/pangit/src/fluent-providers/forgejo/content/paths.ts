import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import { validationContext } from "./validation.ts";

export function normalizeDirectoryPath<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: string,
  value: string,
): string {
  if (value === "" || value === "." || value === "/") return "";
  return requireIdentity(
    value,
    "directory path",
    validationContext(context, operation),
  ).replace(/^\/+|\/+$/g, "");
}

export function providerContentPath(value: string): string {
  return value.replace(/^\/+|\/+$/g, "") || ".";
}

export function directoryName(path: string): string {
  const normalized = path.replace(/^\/+|\/+$/g, "");
  const separator = normalized.lastIndexOf("/");
  return separator < 0 ? "" : normalized.slice(0, separator);
}

export function baseName(path: string): string {
  if (path === "") return ".";
  const separator = path.lastIndexOf("/");
  return separator < 0 ? path : path.slice(separator + 1);
}

export function displayPath(path: string): string {
  return path === "" ? "repository root" : path;
}

export function repositoryPath(repository: { readonly owner: string; readonly name: string }) {
  return {
    owner: requireIdentity(repository.owner, "repository owner"),
    repo: requireIdentity(repository.name, "repository name"),
  };
}
