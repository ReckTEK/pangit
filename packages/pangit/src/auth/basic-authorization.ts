import type { AuthorizedClient } from "../providers/managed-client.ts";
import type { Provider, ProviderVersion } from "../providers/provider.ts";
import type { AuthBranch, BasicAuthorization } from "./authentication-contracts.ts";
import { AuthAdapterNotImplementedError } from "./AuthAdapterNotImplementedError.ts";

class BasicAuthorizationImpl<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> implements BasicAuthorization<TProvider, TVersion> {
  readonly #provider: TProvider;
  readonly #version: TVersion;
  #gitea?: AuthBranch;
  #codeberg?: AuthBranch;
  #bitbucket?: AuthBranch;

  constructor(provider: TProvider, version: TVersion) {
    this.#provider = provider;
    this.#version = version;
  }

  gitea(branch: AuthBranch): this {
    this.#gitea = branch;
    return this;
  }

  codeberg(branch: AuthBranch): this {
    this.#codeberg = branch;
    return this;
  }

  bitbucket(branch: AuthBranch): this {
    this.#bitbucket = branch;
    return this;
  }

  authorize(): Promise<AuthorizedClient<TProvider, TVersion>> {
    let branch: AuthBranch | undefined;
    switch (this.#provider) {
      case "gitea":
        branch = this.#gitea;
        break;
      case "codeberg":
        branch = this.#codeberg;
        break;
      case "bitbucket":
        branch = this.#bitbucket;
        break;
      default:
        return Promise.reject(
          new Error(`${this.#provider} does not support Basic authentication`),
        );
    }
    if (branch === undefined) {
      return Promise.reject(
        new Error(`No Basic authentication branch was declared for ${this.#provider}`),
      );
    }
    void branch;
    return Promise.reject(new AuthAdapterNotImplementedError("Basic authentication"));
  }
}

/** @internal Build Basic authentication selection for one provider client. */
export function createBasicAuthorization<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
>(provider: TProvider, version: TVersion): BasicAuthorization<TProvider, TVersion> {
  return new BasicAuthorizationImpl(provider, version);
}
