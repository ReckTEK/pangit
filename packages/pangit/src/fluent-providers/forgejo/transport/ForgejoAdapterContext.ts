import type { ClientOptions } from "../../../generated-rest-clients/client-options.ts";
import { createRestClient } from "./create-rest-client.ts";
import { RestClient, type RestClientOptions } from "../../../generated-rest-clients/runtime/mod.ts";
import type { ForgejoClient, ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import type { ForgejoUserPayload } from "../native/ForgejoRepositoryContainerNative.ts";

/** Public transport configuration plus the browser-facing Forgejo root used by OAuth. */
export interface ForgejoAdapterOptions extends ClientOptions {
  readonly webBaseUrl?: string | URL;
}

/** Immutable provider context shared by the small Forgejo concern modules. */
export class ForgejoAdapterContext<TVersion extends ForgejoVersion> {
  readonly #options: Readonly<RestClientOptions>;
  readonly #webBaseUrl: URL;
  readonly #currentUser?: ForgejoUserPayload<TVersion>;
  #clientPromise?: Promise<ForgejoClient<TVersion>>;

  constructor(
    readonly version: TVersion,
    options: ForgejoAdapterOptions | RestClientOptions,
    client?: ForgejoClient<TVersion>,
    currentUser?: ForgejoUserPayload<TVersion>,
  ) {
    this.#options = Object.freeze({
      ...options,
      baseUrl: new URL(options.baseUrl).href,
      ...(options.query === undefined ? {} : { query: structuredClone(options.query) }),
      throwOnError: false,
    });
    this.#webBaseUrl = resolveWebBaseUrl(
      options.baseUrl,
      "webBaseUrl" in options ? options.webBaseUrl : undefined,
    );
    this.#currentUser = currentUser;
    if (client !== undefined) this.#clientPromise = Promise.resolve(client);
  }

  /** Exact selected Forgejo client, created once on first provider operation. */
  async client(): Promise<ForgejoClient<TVersion>> {
    this.#clientPromise ??= createRestClient(this.version, this.#options);
    return await this.#clientPromise;
  }

  /** Browser-facing Forgejo root with no API suffix. */
  webBaseUrl(): URL {
    return new URL(this.#webBaseUrl);
  }

  /** Already-verified authenticated identity, when credentials have been attached. */
  currentUser(): ForgejoUserPayload<TVersion> | undefined {
    return this.#currentUser;
  }

  /** Build an unverified sibling context carrying provider-native authorization headers. */
  withHeaders(headers: HeadersInit): ForgejoAdapterContext<TVersion> {
    return new ForgejoAdapterContext(this.version, {
      ...this.#options,
      headers,
      webBaseUrl: this.#webBaseUrl,
    });
  }

  /** Raw OAuth transport preserving lifecycle hooks but excluding API query/auth defaults. */
  oauthTransport(): RestClient {
    return new RestClient({
      baseUrl: this.#webBaseUrl,
      ...(this.#options.fetch === undefined ? {} : { fetch: this.#options.fetch }),
      ...(this.#options.beforeRequest === undefined
        ? {}
        : { beforeRequest: this.#options.beforeRequest }),
      ...(this.#options.afterResponse === undefined
        ? {}
        : { afterResponse: this.#options.afterResponse }),
      throwOnError: false,
      headerForwarding: "same-origin",
    });
  }

  /** Bind the verified identity to an authenticated context without recreating its client. */
  async withCurrentUser(
    currentUser: ForgejoUserPayload<TVersion>,
  ): Promise<ForgejoAdapterContext<TVersion>> {
    return new ForgejoAdapterContext(
      this.version,
      this.#options,
      await this.client(),
      currentUser,
    );
  }
}

function resolveWebBaseUrl(apiBaseUrl: string | URL, explicit?: string | URL): URL {
  if (explicit !== undefined) return normalizeRoot(explicit);
  const root = new URL(apiBaseUrl);
  root.search = "";
  root.hash = "";
  root.pathname = root.pathname.replace(/\/?api\/v1\/?$/, "/");
  return normalizeRoot(root);
}

function normalizeRoot(value: string | URL): URL {
  const root = new URL(value);
  root.search = "";
  root.hash = "";
  if (!root.pathname.endsWith("/")) root.pathname += "/";
  return root;
}
