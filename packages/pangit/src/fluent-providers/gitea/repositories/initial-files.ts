import type { GiteaProviderTypes } from "../provider-types.ts";
import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type {
  InitialRepositoryFile,
  RepositoryData,
} from "../../../fluent-api/adapter-contract/repositories.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaClient, GiteaVersion } from "../native/GiteaEntityNative.ts";

import { requestGitea } from "../transport/response/mod.ts";
import { requestOptions, validationError } from "./request-options.ts";

export async function createGiteaInitialFiles<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  client: GiteaClient<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  files: readonly InitialRepositoryFile[],
  branch: string | undefined,
  message: string | undefined,
  universalOperation: string,
  signal: AbortSignal | undefined,
): Promise<void> {
  const changes = files.map((file) => ({
    operation: "create" as const,
    path: file.path,
    content: encodeBase64(file.content),
  }));

  await requestGitea(
    context,
    { universal: universalOperation, native: "repoChangeFiles" },
    () =>
      client.repoChangeFiles(
        {
          path: { owner: repository.owner, repo: repository.name },
          body: {
            mediaType: "application/json",
            value: {
              files: changes,
              ...(branch === undefined ? {} : { branch }),
              ...(message === undefined ? {} : { message }),
            },
          },
        },
        requestOptions(signal),
      ),
    signal,
  );
}

export function validateInitialFiles<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  files: readonly InitialRepositoryFile[],
): readonly InitialRepositoryFile[] {
  const found = new Set<string>();
  for (const file of files) {
    const path = requireIdentity(file.path, "initial repository file path");
    if (
      path.startsWith("/") || path.endsWith("/") || path.includes("\\") ||
      path.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
    ) {
      throw validationError(context, "createRepository", `invalid initial file path ${path}`);
    }
    if (file.mode !== undefined && file.mode !== "create") {
      throw validationError(
        context,
        "createRepository",
        `unsupported initial file mode for ${path}`,
      );
    }
    if (found.has(path)) {
      throw validationError(context, "createRepository", `duplicate initial file path ${path}`);
    }
    found.add(path);
  }
  return Object.freeze([...files]);
}

function encodeBase64(content: string | Uint8Array): string {
  const bytes = typeof content === "string" ? new TextEncoder().encode(content) : content;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let encoded = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    encoded += alphabet[first >> 2];
    encoded += alphabet[((first & 3) << 4) | (second === undefined ? 0 : second >> 4)];
    encoded += second === undefined
      ? "="
      : alphabet[((second & 15) << 2) | (third === undefined ? 0 : third >> 6)];
    encoded += third === undefined ? "=" : alphabet[third & 63];
  }
  return encoded;
}
