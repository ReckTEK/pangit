import type { ProviderVersion } from "../../../generated-rest-clients/git-host.ts";
import type {
  BlobReadAdapter,
  BlobReadCapabilitySupport,
} from "../../adapter-contract/optional/blob-reads.ts";
import { ValidationError, type ValidationErrorContext } from "../../adapter-contract/errors.ts";
import type { OperationOptions } from "../../adapter-contract/operation-options.ts";
import { requireIdentity } from "../../adapter-contract/operation-options.ts";
import type { RepositoryData } from "../../adapter-contract/repositories.ts";
import { type Blob, createBlob } from "../../entities/optional/Blob.ts";
import type { FluentProvider } from "../../provider-registry.ts";

export interface RepositoryBlobs<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly support: BlobReadCapabilitySupport;
  get(sha: string, options?: OperationOptions): Promise<Blob<TProvider, TVersion>>;
}

export function createRepositoryBlobs<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(
  adapter: BlobReadAdapter<TProvider, TVersion>,
  repository: RepositoryData<TProvider, TVersion>,
): RepositoryBlobs<TProvider, TVersion> {
  return Object.freeze({
    support: adapter.blobReadSupport,
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
  TVersion extends ProviderVersion<TProvider>,
>(
  adapter: BlobReadAdapter<TProvider, TVersion>,
  operation: string,
): ValidationErrorContext<TProvider, TVersion> {
  const identity = adapter as BlobReadAdapter<TProvider, TVersion> & {
    readonly provider?: TProvider;
    readonly version?: TVersion;
  };
  return {
    operation,
    ...(identity.provider === undefined ? {} : { provider: identity.provider }),
    ...(identity.version === undefined ? {} : { version: identity.version }),
  };
}
