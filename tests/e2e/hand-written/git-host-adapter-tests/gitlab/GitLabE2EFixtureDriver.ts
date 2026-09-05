import {
  createClient,
  type ProviderVersion,
} from "../../../../../packages/pangit/src/fluent-client/mod.ts";
import {
  FluentApiRequestRecorder,
  proveRequestSequence,
} from "../../fluent-api-contracts/request-recorder.ts";
import type { FluentApiRequestEvidence } from "../../fluent-api-contracts/contract-result.ts";

/** Raw fixture writes are deliberately outside the fluent request recorder. */
export class GitLabE2EFixtureDriver {
  readonly recorder = new FluentApiRequestRecorder();
  readonly assertions: string[] = [];
  readonly evidence: FluentApiRequestEvidence[] = [];
  readonly prefix = `pangit-${crypto.randomUUID().slice(0, 12)}`;
  readonly projects: string[] = [];
  readonly groups: string[] = [];
  readonly users: string[] = [];
  constructor(
    readonly version: ProviderVersion<"gitlab">,
    readonly apiUrl: string,
    readonly token: string,
    readonly password: string,
  ) {}
  async client() {
    return (await createClient("gitlab", this.version, {
      baseUrl: this.apiUrl,
      beforeRequest: this.recorder.beforeRequest,
    })).auth.token(this.token);
  }
  assert(value: unknown, message: string): void {
    if (!value) throw new Error(message);
    this.assertions.push(message);
  }
  equal(actual: unknown, expected: unknown, message: string): void {
    this.assert(
      JSON.stringify(actual) === JSON.stringify(expected),
      `${message}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
  async prove<T>(label: string, ids: readonly string[], action: () => Promise<T>): Promise<T> {
    const result = proveRequestSequence(label, ids, await this.recorder.capture(action));
    this.evidence.push(result.evidence);
    return result.value;
  }
  async rejects(action: () => Promise<unknown>, name: string) {
    try {
      await action();
    } catch (error) {
      this.equal(error instanceof Error ? error.name : undefined, name, `Rejects with ${name}`);
      return;
    }
    throw new Error(`Expected ${name}`);
  }
  async raw(method: string, path: string, body?: unknown): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.apiUrl}/api/v4${path}`, {
      method,
      headers: {
        "PRIVATE-TOKEN": this.token,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Fixture ${method} ${path}: ${response.status}: ${text.slice(0, 1000)}`);
    }
    return text ? JSON.parse(text) : {};
  }
  async project(label = "repo") {
    const p = await this.raw("POST", "/projects", {
      name: `${this.prefix}-${label}`,
      initialize_with_readme: true,
      default_branch: "main",
      visibility: "private",
    });
    this.projects.push(String(p.id));
    return await (await (await this.client()).container("root")).repository(String(p.path));
  }
  async group(label = "group", parentId?: string) {
    const p = await this.raw("POST", "/groups", {
      name: `${this.prefix}-${label}`,
      path: `${this.prefix}-${label}`,
      parent_id: parentId,
    });
    this.groups.push(String(p.id));
    return await (await this.client()).container(String(p.full_path));
  }
  async commit(id: string, branch: string, path: string, content: string, action = "create") {
    return String(
      (await this.raw("POST", `/projects/${id}/repository/commits`, {
        branch,
        commit_message: `fixture ${path}`,
        actions: [{ action, file_path: path, content }],
      })).id,
    );
  }
  async eventually<T>(
    read: () => Promise<T>,
    ready: (value: T) => boolean,
    label: string,
    attempts = 90,
  ): Promise<T> {
    for (let n = 0; n < attempts; n++) {
      const value = await read();
      if (ready(value)) return value;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error(`Timed out waiting for ${label}`);
  }
  async cleanup() {
    for (const id of [...this.projects].reverse()) {
      await this.raw("DELETE", `/projects/${id}`).catch((e) => {
        if (!String(e).includes(": 404:")) throw e;
      });
    }
    for (const id of [...this.groups].reverse()) await this.raw("DELETE", `/groups/${id}`);
    for (const id of this.users) await this.raw("DELETE", `/users/${id}`);
  }
}
