import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoClient, ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import { type ForgejoOperationIdentity, requestForgejoBody } from "../transport/response/mod.ts";
import { providerContentPath, repositoryPath } from "./paths.ts";
import { requestOptions } from "./validation.ts";
import { isContents } from "./validate-payload.ts";
import type { ForgejoContents } from "./payload-types.ts";
import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";

/** Forgejo returns one entry for files/links and the exact entry array for directories. */
export async function getContents<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
  client: ForgejoClient<V>,
  repository: { readonly owner: string; readonly name: string },
  path: string,
  ref: string | undefined,
  operation: ForgejoOperationIdentity,
  signal?: AbortSignal,
): Promise<ForgejoContents> {
  const query = ref === undefined ? {} : { ref: requireIdentity(ref, "content ref") };
  return await requestForgejoBody<ForgejoContents, V>(
    context,
    operation,
    () =>
      path === "" || path === "/"
        ? client.repoGetContentsList(
          { path: repositoryPath(repository), query },
          requestOptions(signal),
        )
        : client.repoGetContents({
          path: { ...repositoryPath(repository), filepath: providerContentPath(path) },
          query,
        }, requestOptions(signal)),
    signal,
    isContents,
  );
}
