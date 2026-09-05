import type {
  ContentData,
  ReadLinkedContentOptions,
} from "../../../fluent-api/adapter-contract/content.ts";

import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import { readGiteaContent } from "./read-file.ts";
import { validationContext, validationError } from "./validation.ts";
import { directoryName, displayPath } from "./paths.ts";

/** Return one raw symlink target; never follow it. */
export async function readGiteaSymlink<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  path: string,
  options: ReadLinkedContentOptions = {},
): Promise<ContentData<"gitea", TVersion>> {
  const operation = { universal: "readSymlink", native: "repoGetContentsExt" } as const;
  const content = await readGiteaContent(
    context,
    repository,
    path,
    {
      ...options,
      includeBytes: false,
    },
    operation,
  );
  if (content.kind !== "symlink") {
    throw validationError(context, "readSymlink", `${displayPath(path)} is not a symlink`);
  }
  if (options.dereference !== "internal") return content;
  const targetPath = resolveInternalSymlinkPath(context, content.path, content.target!);
  const dereferenced = await readGiteaContent(
    context,
    repository,
    targetPath,
    {
      ref: options.ref,
      includeBytes: options.includeBytes,
      includeCommitMetadata: options.includeCommitMetadata,
      signal: options.signal,
    },
    operation,
  );
  return Object.freeze({ ...content, dereferenced });
}

function resolveInternalSymlinkPath<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  linkPath: string,
  target: string,
): string {
  if (target.startsWith("/") || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(target)) {
    throw validationError(
      context,
      "readSymlink",
      `symlink ${linkPath} points outside the repository`,
    );
  }
  const segments = [...directoryName(linkPath).split("/"), ...target.split("/")];
  const resolved: string[] = [];
  for (const segment of segments) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (resolved.length === 0) {
        throw validationError(
          context,
          "readSymlink",
          `symlink ${linkPath} escapes the repository root`,
        );
      }
      resolved.pop();
      continue;
    }
    resolved.push(segment);
  }
  return requireIdentity(
    resolved.join("/"),
    "symlink target path",
    validationContext(context, "readSymlink"),
  );
}
