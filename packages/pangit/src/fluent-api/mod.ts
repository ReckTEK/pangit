/** Git-host-neutral fluent API. @module */

export { createClient } from "./FluentClient.ts";
export type { AuthorizedClient, FluentClient } from "./FluentClient.ts";
export type { ClientOptions } from "../generated-rest-clients/client-options.ts";
export type { RepositoryContainer } from "./containers/RepositoryContainer.ts";
export type {
  CreateRepositoryOptions,
  RepositoryContainerKind,
} from "./host-adapter-contract/RepositoryHostAdapter.ts";
export type { Repository } from "./repositories/Repository.ts";
export type { Provider, ProviderVersion } from "../generated-rest-clients/git-host.ts";
export * as auth from "./auth/mod.ts";
