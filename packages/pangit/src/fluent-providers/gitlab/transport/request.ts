import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type {
  AnyRestResponse,
  RestGeneratedRequestOptions,
  RestJsonData,
  RestOperationInput,
} from "../../../generated-rest-clients/runtime/mod.ts";
import type { GitLabAdapterContext } from "./GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";
import { requestGitLab } from "./response/mod.ts";
import { supplementalOperation } from "../supplemental.ts";
import type { Client, Input, Method } from "./request-input.ts";

/** Small typed transport bridge; operation inputs are checked against the older shared API. */
export async function call<V extends GitLabVersion, M extends Method>(
  c: GitLabAdapterContext<V>,
  operation: string,
  method: M,
  input: Input<M>,
  options: OperationOptions = {},
) {
  const client = await c.client();
  const execute = (client as Client)[method] as unknown as (
    input: Input<M>,
    options: RestGeneratedRequestOptions,
  ) => Promise<AnyRestResponse>;
  return await requestGitLab(
    c,
    { universal: operation, native: method },
    () => execute.call(client, input, { signal: options.signal }),
    options.signal,
  );
}

export async function extra<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  operation: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  input: RestOperationInput = {},
  options: OperationOptions = {},
) {
  const client = await c.client();
  const endpoint = supplementalOperation(method, path);
  return await requestGitLab(
    c,
    { universal: operation, native: endpoint.id },
    () => client.rest.request(endpoint, input, { signal: options.signal }),
    options.signal,
  );
}

export function body<T extends object>(value: T) {
  const clean = Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined));
  return {
    mediaType: "application/json" as const,
    value: clean as T & Record<string, RestJsonData>,
  };
}
