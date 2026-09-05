import type { FluentClientOptions } from "../fluent-api/adapter-contract/client-options.ts";

/** Own mutable transport configuration before the first provider import can yield. */
export function snapshotClientOptions(options: FluentClientOptions): FluentClientOptions {
  return {
    ...options,
    baseUrl: new URL(options.baseUrl).href,
    ...(options.webBaseUrl === undefined ? {} : { webBaseUrl: new URL(options.webBaseUrl).href }),
    ...(options.query === undefined ? {} : { query: structuredClone(options.query) }),
  };
}
