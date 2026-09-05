import type { ForgejoProviderTypes } from "../provider-types.ts";
import type {
  ContentData,
  ReadLinkedContentOptions,
} from "../../../fluent-api/adapter-contract/content.ts";

import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import {
  createForgejoContentsListNative,
  type ForgejoEntityPayload,
  type ForgejoVersion,
} from "../native/ForgejoEntityNative.ts";
import { requestForgejoBody } from "../transport/response/mod.ts";
import { readForgejoContent } from "./read-file.ts";
import { requestOptions, validationContext, validationError } from "./validation.ts";
import { displayPath, repositoryPath } from "./paths.ts";

import { isContentArray } from "./validate-payload.ts";
import type { AnyForgejoContent } from "./payload-types.ts";

/** Return one submodule URL/SHA metadata record; never contact its remote. */
export async function readForgejoSubmodule<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  path: string,
  options: ReadLinkedContentOptions = {},
): Promise<ContentData<"forgejo", TVersion, ForgejoProviderTypes>> {
  const operation = { universal: "readSubmodule", native: "repoGetContents" } as const;
  const content = await readForgejoContent(
    context,
    repository,
    path,
    {
      ...options,
      includeBytes: false,
    },
    operation,
  );
  if (content.kind !== "submodule") {
    throw validationError(context, "readSubmodule", `${displayPath(path)} is not a submodule`);
  }
  if (options.dereference !== "internal") return content;
  const targetRepository = parseInternalSubmoduleRepository(
    context,
    content.submoduleUrl!,
  );
  const targetSha = requireIdentity(
    content.sha ?? "",
    "submodule commit SHA",
    validationContext(context, "readSubmodule"),
  );
  const client = await context.client();
  const entries = await requestForgejoBody<readonly AnyForgejoContent[], TVersion>(
    context,
    { universal: "readSubmodule", native: "repoGetContentsList" },
    () =>
      client.repoGetContentsList(
        {
          path: repositoryPath(targetRepository),
          query: { ref: targetSha },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isContentArray,
  );
  return Object.freeze({
    ...content,
    dereferenced: Object.freeze({
      kind: "directory",
      path: "",
      name: "",
      native: createForgejoContentsListNative(
        client,
        entries as readonly ForgejoEntityPayload<TVersion, "content">[],
      ),
    }),
  });
}

function parseInternalSubmoduleRepository<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  submoduleUrl: string,
): { readonly owner: string; readonly name: string } {
  const providerRoot = context.webBaseUrl();
  let target: URL;
  try {
    target = new URL(submoduleUrl, providerRoot);
  } catch {
    throw validationError(context, "readSubmodule", "submodule URL is invalid");
  }
  if (target.origin !== providerRoot.origin) {
    throw validationError(
      context,
      "readSubmodule",
      "submodule dereference is restricted to this Forgejo instance",
    );
  }
  const rootPath = providerRoot.pathname.replace(/^\/+|\/+$/g, "");
  const targetPath = target.pathname.replace(/^\/+|\/+$/g, "");
  const relativePath = rootPath.length === 0
    ? targetPath
    : targetPath.startsWith(`${rootPath}/`)
    ? targetPath.slice(rootPath.length + 1)
    : "";
  const segments = relativePath.replace(/\.git$/, "").split("/").filter(Boolean);
  if (segments.length !== 2) {
    throw validationError(
      context,
      "readSubmodule",
      "submodule URL is not a repository on this Forgejo instance",
    );
  }
  return Object.freeze({
    owner: requireIdentity(
      decodeURIComponent(segments[0]),
      "submodule owner",
      validationContext(context, "readSubmodule"),
    ),
    name: requireIdentity(
      decodeURIComponent(segments[1]),
      "submodule repository",
      validationContext(context, "readSubmodule"),
    ),
  });
}
