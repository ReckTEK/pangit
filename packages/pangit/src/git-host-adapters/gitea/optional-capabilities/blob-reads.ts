import { ProviderInvariantError } from "../../../fluent-api/adapter-contract/errors.ts";
import type {
  BlobData,
  BlobReadCapabilitySupport,
  ReadGitBlobOptions,
} from "../../../fluent-api/adapter-contract/optional/blob-reads.ts";
import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";
import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import {
  createWebBlob,
  decodeContentText,
  parseContentJson,
  requireContentBytes,
  validateContentBlobOptions,
} from "../../../fluent-api/content-body.ts";
import type { GiteaAdapterContext } from "../GiteaAdapterContext.ts";
import { createGiteaBlobNative, type GiteaBlobPayload } from "../native/GiteaBlobNative.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";
import { type GiteaOperationIdentity, requestGiteaBody } from "../response.ts";

type AnyGiteaBlob = GiteaBlobPayload<GiteaVersion>;

export const giteaBlobReadSupport = Object.freeze({
  supported: true,
  operations: Object.freeze({
    get: "direct",
    readBytes: "direct",
    readText: "direct",
    readJson: "direct",
    readBlob: "direct",
  }),
}) satisfies BlobReadCapabilitySupport;

/** Read one Git blob directly by object ID. */
export async function getGiteaBlob<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  requestedSha: string,
  options: OperationOptions = {},
  operation: GiteaOperationIdentity = { universal: "getBlob", native: "GetBlob" },
): Promise<BlobData<"gitea", TVersion>> {
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

/** Read one Git blob as a defensive byte copy with one direct request. */
export async function readGiteaBlobBytes<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  sha: string,
  options: OperationOptions = {},
  operation = "readBlobBytes",
): Promise<Uint8Array> {
  const blob = await getGiteaBlob(context, repository, sha, options, {
    universal: operation,
    native: "GetBlob",
  });
  return requireContentBytes(blob, { provider: "gitea", version: context.version, operation });
}

/** Read one Git blob as strict UTF-8 text. */
export async function readGiteaBlobText<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  sha: string,
  options: OperationOptions = {},
): Promise<string> {
  const operation = "readBlobText";
  const bytes = await readGiteaBlobBytes(context, repository, sha, options, operation);
  return decodeContentText(bytes, { provider: "gitea", version: context.version, operation });
}

/** Read one Git blob as JSON without asserting a caller-specific schema. */
export async function readGiteaBlobJson<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  sha: string,
  options: OperationOptions = {},
): Promise<unknown> {
  const operation = "readBlobJson";
  const bytes = await readGiteaBlobBytes(context, repository, sha, options, operation);
  return parseContentJson(bytes, { provider: "gitea", version: context.version, operation });
}

/** Git objects have no filename or file MIME type; the caller supplies a name or explicit type. */
export async function readGiteaBlob<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  sha: string,
  options: ReadGitBlobOptions = {},
): Promise<globalThis.Blob> {
  const operation = "readBlob";
  const errorContext = { provider: "gitea" as const, version: context.version, operation };
  validateContentBlobOptions(options, errorContext);
  const blob = await getGiteaBlob(context, repository, sha, options, {
    universal: operation,
    native: "GetBlob",
  });
  return createWebBlob(blob, options, errorContext);
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
