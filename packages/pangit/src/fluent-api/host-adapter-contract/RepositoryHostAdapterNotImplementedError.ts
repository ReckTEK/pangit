import type { Provider } from "../../generated-rest-clients/git-host.ts";

/** The selected provider does not yet implement the repository-container contract. */
export class RepositoryHostAdapterNotImplementedError extends Error {
  /** Create an implementation error for one selected provider. */
  constructor(provider: Provider) {
    super(`${provider} does not yet implement the repository-container API`);
    this.name = "RepositoryHostAdapterNotImplementedError";
  }
}
