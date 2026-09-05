import type {
  Provider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../adapter-contract/provider.ts";

import type {
  BasicAuthorizationInput,
  BasicAuthorizationOptions,
} from "../adapter-contract/authentication.ts";
import type { OperationOptions } from "../adapter-contract/operation-options.ts";
import type { FluentClient } from "../client/FluentClient.ts";
import type { BasicAuthorization, MaybePromise } from "./authentication-contracts.ts";
import type { ProviderExtensionOptions } from "../provider-extensions/ProviderExtensionRegistry.ts";
import {
  type ExtensionSupport,
  supportsExtension,
} from "../provider-extensions/ExtensionSupport.ts";

export type BasicClientAuthorizer<
  P extends Provider,
  V extends ProviderVersion<P, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = (
  input: BasicAuthorizationInput,
  options?: BasicAuthorizationOptions<P, TRegistry>,
) => Promise<FluentClient<P, V, TRegistry>>;

/** Defer credentials and extension evaluation until explicit authorization. */
export function createBasicAuthorization<
  P extends Provider,
  V extends ProviderVersion<P, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  provider: P,
  version: V,
  support: ExtensionSupport<ProviderExtensionOptions<"auth.basic", P, TRegistry>> | undefined,
  input: BasicAuthorizationInput,
  authorizeClient: BasicClientAuthorizer<P, V, TRegistry>,
): BasicAuthorization<P, V, TRegistry> {
  const credentials = Object.freeze({ ...input });
  let configure:
    | (() => MaybePromise<ProviderExtensionOptions<"auth.basic", P, TRegistry>>)
    | undefined;
  const operation = {
    async authorize(options: OperationOptions = {}) {
      const extension = configure === undefined ? undefined : await configure();
      if (extension !== undefined) {
        support?.validate?.(extension, { provider, version, operation: "authorizeBasic" });
      }
      return await authorizeClient(credentials, { ...options, extension });
    },
    ...(supportsExtension(support, version)
      ? {
        [provider](branch: NonNullable<typeof configure>) {
          configure = branch;
          return operation;
        },
      }
      : {}),
  };
  return Object.freeze(operation) as BasicAuthorization<P, V, TRegistry>;
}
