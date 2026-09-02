/** Provider-neutral fluent API. @module */

export { createClient } from "./FluentClient.ts";
export type { AuthorizedClient, FluentClient } from "./FluentClient.ts";
export type { ClientOptions } from "../providers/managed-client.ts";
export type { RepositoryContainer } from "./containers/RepositoryContainer.ts";
export type {
  CreateRepositoryOptions,
  RepositoryContainerKind,
} from "./provider-adapters/RepositoryProviderAdapter.ts";
export type { Repository } from "./repositories/Repository.ts";
export type { Provider, ProviderVersion } from "../providers/provider.ts";
export * as auth from "./auth/mod.ts";
