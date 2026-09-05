import type { ClientOptions } from "../../../generated-rest-clients/client-options.ts";
import { createRestClient } from "./create-rest-client.ts";
import { RestClient, type RestClientOptions } from "../../../generated-rest-clients/runtime/mod.ts";
import type { GiteaClient, GiteaVersion } from "../native/GiteaEntityNative.ts";
import type { GiteaUserPayload } from "../native/GiteaRepositoryContainerNative.ts";

/** Public transport configuration plus the browser-facing Gitea root used by OAuth. */
export interface GiteaAdapterOptions extends ClientOptions {
  readonly webBaseUrl?: string | URL;
}

/** Immutable provider context shared by the small Gitea concern modules. */
export class GiteaAdapterContext<TVersion extends GiteaVersion> {
  readonly #options: Readonly<RestClientOptions>;
  readonly #webBaseUrl: URL;
  readonly #currentUser?: GiteaUserPayload<TVersion>;
  #clientPromise?: Promise<GiteaClient<TVersion>>;

  constructor(
    readonly version: TVersion,
    options: GiteaAdapterOptions | RestClientOptions,
    client?: GiteaClient<TVersion>,
    currentUser?: GiteaUserPayload<TVersion>,
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

  /** Exact selected Gitea client, created once on first provider operation. */
  async client(): Promise<GiteaClient<TVersion>> {
    this.#clientPromise ??= createRestClient(this.version, this.#options);
    return await this.#clientPromise;
  }

  /** Browser-facing Gitea root with no API suffix. */
  webBaseUrl(): URL {
    return new URL(this.#webBaseUrl);
  }

  /** Already-verified authenticated identity, when credentials have been attached. */
  currentUser(): GiteaUserPayload<TVersion> | undefined {
    return this.#currentUser;
  }

  /** Build an unverified sibling context carrying provider-native authorization headers. */
  withHeaders(headers: HeadersInit): GiteaAdapterContext<TVersion> {
    return new GiteaAdapterContext(this.version, {
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
    currentUser: GiteaUserPayload<TVersion>,
  ): Promise<GiteaAdapterContext<TVersion>> {
    return new GiteaAdapterContext(
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
