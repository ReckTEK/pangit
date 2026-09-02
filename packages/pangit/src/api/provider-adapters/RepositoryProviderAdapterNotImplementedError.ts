import type { Provider } from "../../providers/provider.ts";

/** The selected provider does not yet implement the repository-container contract. */
export class RepositoryProviderAdapterNotImplementedError extends Error {
  /** Create an implementation error for one selected provider. */
  constructor(provider: Provider) {
    super(`${provider} does not yet implement the repository-container API`);
    this.name = "RepositoryProviderAdapterNotImplementedError";
  }
}
