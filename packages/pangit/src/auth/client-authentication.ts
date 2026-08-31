import type { AuthorizedClient, ClientOptions } from "../providers/managed-client.ts";
import type { Provider, ProviderVersion } from "../providers/provider.ts";
import { loadRestClient } from "../providers/registry.ts";
import type { Auth, BasicAuthorization, TokenAuthorization } from "./authentication-contracts.ts";
import { AuthAdapterNotImplementedError } from "./AuthAdapterNotImplementedError.ts";
import { createBasicAuthorization } from "./basic-authorization.ts";
import type { Login, LoginOptions } from "./oauth-contracts.ts";
import { createOAuthLogin } from "./oauth-login.ts";

class AuthImpl<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> implements Auth<TProvider, TVersion> {
  readonly #provider: TProvider;
  readonly #version: TVersion;
  readonly #options: ClientOptions;

  constructor(provider: TProvider, version: TVersion, options: ClientOptions) {
    this.#provider = provider;
    this.#version = version;
    this.#options = options;
  }

  async token(input: TokenAuthorization): Promise<AuthorizedClient<TProvider, TVersion>> {
    if (input.token.length === 0) throw new TypeError("token cannot be empty");
    if (this.#provider !== "gitea") {
      throw new AuthAdapterNotImplementedError("Token authentication");
    }

    const client = await loadRestClient(
      "gitea",
      this.#version as ProviderVersion<"gitea">,
      {
        ...this.#options,
        headers: { Authorization: `token ${input.token}` },
        throwOnError: false,
      },
    );
    const response = await client.userGetCurrent();
    if (!response.ok || response.status !== 200 || !response.documented) {
      throw new Error(
        `Gitea token authorization failed: GET /user returned HTTP ${response.status}`,
      );
    }

    return Object.freeze({
      provider: this.#provider,
      version: this.#version,
    });
  }

  login(options: LoginOptions): Login<TProvider, TVersion> {
    return createOAuthLogin(this.#provider, this.#version, options, this.#options);
  }

  basic(): BasicAuthorization<TProvider, TVersion> {
    return createBasicAuthorization(this.#provider, this.#version);
  }
}

/** @internal Build the authentication capability for one selected client. */
export function createAuth<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
>(
  provider: TProvider,
  version: TVersion,
  options: ClientOptions,
): Auth<TProvider, TVersion> {
  return new AuthImpl(provider, version, options);
}
