import type { ProviderVersion } from "../../generated-rest-clients/git-host.ts";
import type { BasicAuthorizationInput } from "../adapter-contract/authentication.ts";
import type { OperationOptions } from "../adapter-contract/operation-options.ts";
import type { FluentProvider } from "../provider-registry.ts";
import type { FluentClient } from "../FluentClient.ts";
import type {
  BasicAuthorization,
  GiteaBasicAuthorizationBranch,
} from "./authentication-contracts.ts";

export type BasicClientAuthorizer<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> = (
  input: BasicAuthorizationInput,
  options?: OperationOptions,
) => Promise<FluentClient<TProvider, TVersion>>;

class BasicAuthorizationImpl<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  #gitea?: GiteaBasicAuthorizationBranch;
  readonly #input: Omit<BasicAuthorizationInput, "oneTimePassword">;
  readonly #authorizeClient: BasicClientAuthorizer<TProvider, TVersion>;

  constructor(
    input: Omit<BasicAuthorizationInput, "oneTimePassword">,
    authorizeClient: BasicClientAuthorizer<TProvider, TVersion>,
  ) {
    this.#input = Object.freeze({ ...input });
    this.#authorizeClient = authorizeClient;
  }

  gitea(branch: GiteaBasicAuthorizationBranch): this {
    this.#gitea = branch;
    return this;
  }

  async authorize(options: OperationOptions = {}): Promise<FluentClient<TProvider, TVersion>> {
    const extension = this.#gitea === undefined ? undefined : await this.#gitea();
    return await this.#authorizeClient({
      ...this.#input,
      ...(extension?.oneTimePassword === undefined
        ? {}
        : { oneTimePassword: extension.oneTimePassword }),
    }, options);
  }
}

/** @internal Build a Basic authorization operation for the selected adapter. */
export function createBasicAuthorization<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(
  provider: TProvider,
  input: Omit<BasicAuthorizationInput, "oneTimePassword">,
  authorizeClient: BasicClientAuthorizer<TProvider, TVersion>,
): BasicAuthorization<TProvider, TVersion> {
  const operation = new BasicAuthorizationImpl(input, authorizeClient);
  return (provider === "gitea"
    ? operation
    : Object.freeze({ authorize: operation.authorize.bind(operation) })) as BasicAuthorization<
      TProvider,
      TVersion
    >;
}
