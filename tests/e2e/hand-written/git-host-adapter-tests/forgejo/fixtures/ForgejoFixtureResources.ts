import { unwrapRestResponse } from "../../../../../../packages/pangit/src/generated-rest-clients/runtime/mod.ts";
import type { Cleanup, ForgejoClient, ForgejoVersion } from "./types.ts";
export class ForgejoFixtureResources<TVersion extends ForgejoVersion> {
  readonly #cleanups: Cleanup[] = [];
  #closed = false;
  constructor(
    readonly client: ForgejoClient<TVersion>,
    readonly apiUrl: string,
    readonly token: string,
    readonly timeoutMs: number,
    readonly currentUser: string,
  ) {}

  trackCleanup(cleanup: Cleanup): void {
    this.#cleanups.push(cleanup);
  }

  async cleanup(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    const errors: string[] = [];
    for (const cleanup of this.#cleanups.toReversed()) {
      try {
        await cleanup.run();
      } catch (error) {
        errors.push(`${cleanup.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    this.#cleanups.length = 0;
    if (errors.length > 0) throw new Error(`Forgejo fixture cleanup failed: ${errors.join("; ")}`);
  }

  async createUserRepository(name: string): Promise<void> {
    unwrapRestResponse(
      await this.client.createCurrentUserRepo({
        body: {
          mediaType: "application/json",
          value: { name, auto_init: true, default_branch: "main" },
        },
      }, { signal: this.timeoutSignal() }),
    );
    this.trackRepository(this.currentUser, name);
  }

  async createOrganization(name: string): Promise<void> {
    unwrapRestResponse(
      await this.client.orgCreate({
        body: {
          mediaType: "application/json",
          value: { username: name, full_name: `PanGit E2E ${name}` },
        },
      }, { signal: this.timeoutSignal() }),
    );
    this.#cleanups.push({
      name: `organization ${name}`,
      run: async () => {
        const result = await this.client.orgDelete(
          { path: { org: name } },
          { signal: this.timeoutSignal() },
        );
        if (result.status !== 404) unwrapRestResponse(result);
      },
    });
  }

  async createOrganizationRepository(organization: string, name: string): Promise<void> {
    unwrapRestResponse(
      await this.client.createOrgRepo({
        path: { org: organization },
        body: {
          mediaType: "application/json",
          value: { name, auto_init: true, default_branch: "main" },
        },
      }, { signal: this.timeoutSignal() }),
    );
    this.trackRepository(organization, name);
  }

  async uploadGenericPackage(
    coordinates: { readonly owner: string; readonly type: "generic"; readonly name: string },
    version: string,
    filename: string,
    bytes: Uint8Array,
  ): Promise<void> {
    const url = this.packageEndpoint(
      "packages",
      coordinates.owner,
      coordinates.type,
      coordinates.name,
      version,
      filename,
    );
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `token ${this.token}`,
        "Content-Type": "application/octet-stream",
      },
      body: bytes.slice().buffer as ArrayBuffer,
      signal: this.timeoutSignal(),
    });
    if (!response.ok) {
      throw new Error(`Forgejo package fixture upload failed with HTTP ${response.status}`);
    }
  }

  trackPackage(coordinates: {
    readonly owner: string;
    readonly type: "generic";
    readonly name: string;
  }, versions: readonly string[]): void {
    this.trackCleanup({
      name: `package ${coordinates.owner}/${coordinates.type}/${coordinates.name}`,
      run: async () => {
        for (const version of versions) {
          const response = await this.client.deletePackage({ path: { ...coordinates, version } }, {
            signal: this.timeoutSignal(),
          });
          if (response.status !== 404) unwrapRestResponse(response);
        }
      },
    });
  }

  packageEndpoint(...segments: readonly string[]): URL {
    const url = new URL(this.apiUrl);
    const apiPath = url.pathname.replace(/\/+$/, "");
    if (!apiPath.endsWith("/api/v1")) {
      throw new Error(`Forgejo API base URL must end in /api/v1: ${url.origin}${apiPath}`);
    }
    url.pathname = `${apiPath.slice(0, -3)}/${segments.map(encodeURIComponent).join("/")}`;
    url.search = "";
    url.hash = "";
    return url;
  }

  trackRepository(owner: string, repository: string): void {
    this.#cleanups.push({
      name: `repository ${owner}/${repository}`,
      run: async () => {
        const result = await this.client.repoDelete(
          { path: { owner, repo: repository } },
          { signal: this.timeoutSignal() },
        );
        if (result.status !== 404) unwrapRestResponse(result);
      },
    });
  }

  timeoutSignal(): AbortSignal {
    return AbortSignal.timeout(this.timeoutMs);
  }

  requireOpen(): void {
    if (this.#closed) throw new Error("Forgejo fixture driver is already closed");
  }
}
