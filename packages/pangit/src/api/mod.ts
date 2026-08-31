/** Provider-neutral fluent API. @module */

export { createClient } from "./FluentClient.ts";
export type { FluentClient } from "./FluentClient.ts";
export type { AuthorizedClient, ClientOptions } from "../providers/managed-client.ts";
export type { Provider, ProviderVersion } from "../providers/provider.ts";
export * as auth from "./auth/mod.ts";
