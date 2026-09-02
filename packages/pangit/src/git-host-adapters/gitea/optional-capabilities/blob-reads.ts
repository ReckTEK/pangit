import { ProviderInvariantError } from "../../../fluent-api/adapter-contract/errors.ts";
import type {
  BlobData,
  BlobReadCapabilitySupport,
} from "../../../fluent-api/adapter-contract/optional/blob-reads.ts";
import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";
import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { GiteaAdapterContext } from "../GiteaAdapterContext.ts";
import { createGiteaBlobNative, type GiteaBlobPayload } from "../native/GiteaBlobNative.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";
import { requestGiteaBody } from "../response.ts";

type AnyGiteaBlob = GiteaBlobPayload<GiteaVersion>;

export const giteaBlobReadSupport = Object.freeze({
  supported: true,
  operations: Object.freeze({ get: "direct" }),
}) satisfies BlobReadCapabilitySupport;

/** Read one Git blob directly by object ID. */
export async function getGiteaBlob<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  requestedSha: string,
  options: OperationOptions = {},
): Promise<BlobData<"gitea", TVersion>> {
  const operation = { universal: "getBlob", native: "GetBlob" } as const;
  const sha = requireGitObjectId(requestedSha);
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaBlob, TVersion>(
    context,
    operation,
    () =>
      client.getBlob(
        { path: { ...repositoryPath(repository), sha } },
        requestOptions(options.signal),
      ),
    options.signal,
    isBlobPayload,
  );
  const returnedSha = requiredText(payload.sha, "blob SHA").toLowerCase();
  if (returnedSha !== sha) {
    throw invariant(
      context,
      operation.universal,
      `returned blob ${returnedSha} for requested SHA ${sha}`,
    );
  }
  const bytes = decodeBlobBytes(context, operation.universal, payload);
  const size = safeNonNegativeInteger(payload.size!, "blob size");
  if (size !== bytes.byteLength) {
    throw invariant(
      context,
      operation.universal,
      `reported blob size ${size} does not match ${bytes.byteLength} decoded bytes`,
    );
  }
  return Object.freeze({
    sha: returnedSha,
    size,
    bytes,
    native: createGiteaBlobNative(client, payload as GiteaBlobPayload<TVersion>),
  });
}

function requireGitObjectId(value: string): string {
  const sha = requireIdentity(value, "blob SHA");
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(sha)) {
    throw new TypeError("blob SHA must be a 40- or 64-character hexadecimal object ID");
  }
  return sha.toLowerCase();
}

function isBlobPayload(value: unknown): value is AnyGiteaBlob {
  if (typeof value !== "object" || value === null) return false;
  const blob = value as AnyGiteaBlob;
  return typeof blob.sha === "string" && blob.sha.length > 0 &&
    typeof blob.content === "string" && blob.encoding === "base64" &&
    (typeof blob.size === "number" || typeof blob.size === "bigint");
}

function decodeBlobBytes<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  payload: AnyGiteaBlob,
): Uint8Array {
  const encoded = payload.content!.replace(/\s/g, "");
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    throw invariant(context, operation, "returned malformed base64 blob content");
  }
  try {
    return Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  } catch (cause) {
    throw invariant(context, operation, "returned malformed base64 blob content", cause);
  }
}

function safeNonNegativeInteger(value: number | bigint, name: string): number {
  const number = typeof value === "bigint" ? Number(value) : value;
  if (!Number.isSafeInteger(number) || number < 0) throw new TypeError(`${name} is invalid`);
  return number;
}

function requiredText(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${name} is missing`);
  }
  return value;
}

function repositoryPath(repository: { readonly owner: string; readonly name: string }) {
  return {
    owner: requireIdentity(repository.owner, "repository owner"),
    repo: requireIdentity(repository.name, "repository name"),
  };
}

function requestOptions(signal?: AbortSignal): { readonly signal: AbortSignal } | undefined {
  return signal === undefined ? undefined : { signal };
}

function invariant<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  message: string,
  cause?: unknown,
): ProviderInvariantError {
  return new ProviderInvariantError(message, {
    provider: "gitea",
    version: context.version,
    operation,
    ...(cause === undefined ? {} : { cause }),
  });
}
