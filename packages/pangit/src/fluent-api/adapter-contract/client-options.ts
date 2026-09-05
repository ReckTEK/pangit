import type { RestClientOptions } from "../../generated-rest-clients/runtime/mod.ts";

/** Transport configuration with optional browser-facing host root for authorization. */
export interface FluentClientOptions extends Omit<RestClientOptions, "headers"> {
  readonly webBaseUrl?: string | URL;
}
