import type {
  FluentProvider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../../adapter-contract/provider.ts";

import type {
  BlobReadAdapter,
  BlobReadCapabilitySupport,
  ReadGitBlobOptions,
} from "../../adapter-contract/optional/blob-reads.ts";
import { ValidationError, type ValidationErrorContext } from "../../adapter-contract/errors.ts";
import {
  type OperationOptions,
  requireIdentity,
} from "../../adapter-contract/operation-options.ts";

import type { RepositoryData } from "../../adapter-contract/repositories.ts";
import { type Blob, createBlob } from "../../entities/optional/Blob.ts";

import { validateContentBlobOptions } from "../../content-body.ts";

export interface RepositoryBlobs<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly support: BlobReadCapabilitySupport;
  /** Read a standard web Blob. SHA-only objects may require a filename hint or explicit MIME type. */
  readBlob(sha: string, options?: ReadGitBlobOptions): Promise<globalThis.Blob>;
  /** Read an exact Git blob as independent bytes without path discovery. */
  readBytes(sha: string, options?: OperationOptions): Promise<Uint8Array>;
  /** Read an exact Git blob as strict UTF-8. */
  readText(sha: string, options?: OperationOptions): Promise<string>;
  /** Read an exact Git blob as UTF-8 JSON; callers validate its shape. */
  readJson(sha: string, options?: OperationOptions): Promise<unknown>;
  get(sha: string, options?: OperationOptions): Promise<Blob<TProvider, TVersion, TRegistry>>;
}

export function createRepositoryBlobs<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  adapter: BlobReadAdapter<TProvider, TVersion, TRegistry>,
  repository: RepositoryData<TProvider, TVersion, TRegistry>,
): RepositoryBlobs<TProvider, TVersion, TRegistry> {
  return Object.freeze({
    support: adapter.blobReadSupport,
    async readBlob(sha: string, options: ReadGitBlobOptions = {}) {
      const context = adapterValidationContext(adapter, "readBlob");
      validateContentBlobOptions(options, context);
      return await adapter.readBlob(repository, requireGitObjectId(sha, context), options);
    },
    async readBytes(sha: string, options: OperationOptions = {}) {
      const context = adapterValidationContext(adapter, "readBlobBytes");
      return await adapter.readBlobBytes(repository, requireGitObjectId(sha, context), options);
    },
    async readText(sha: string, options: OperationOptions = {}) {
      const context = adapterValidationContext(adapter, "readBlobText");
      return await adapter.readBlobText(repository, requireGitObjectId(sha, context), options);
    },
    async readJson(sha: string, options: OperationOptions = {}) {
      const context = adapterValidationContext(adapter, "readBlobJson");
      return await adapter.readBlobJson(repository, requireGitObjectId(sha, context), options);
    },
    async get(sha: string, options: OperationOptions = {}) {
      const context = adapterValidationContext(adapter, "getBlob");
      return createBlob(
        await adapter.getBlob(repository, requireGitObjectId(sha, context), options),
      );
    },
  });
}

export function requireGitObjectId(
  value: string,
  context: ValidationErrorContext = { operation: "getBlob" },
): string {
  const sha = requireIdentity(value, "blob SHA", context);
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(sha)) {
    throw new ValidationError(
      "blob SHA must be a 40- or 64-character hexadecimal object ID",
      context,
    );
  }
  return sha.toLowerCase();
}

function adapterValidationContext<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  adapter: BlobReadAdapter<TProvider, TVersion, TRegistry>,
  operation: string,
): ValidationErrorContext<TProvider, TVersion> {
  const identity = adapter as BlobReadAdapter<TProvider, TVersion, TRegistry> & {
    readonly provider?: TProvider;
    readonly version?: TVersion;
  };
  return {
    operation,
    ...(identity.provider === undefined ? {} : { provider: identity.provider }),
    ...(identity.version === undefined ? {} : { version: identity.version }),
  };
}
