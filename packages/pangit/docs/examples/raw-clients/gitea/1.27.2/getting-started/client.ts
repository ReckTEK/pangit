/** Save as client.ts in your own Deno project; these are tutorial helpers, not package exports. */
import { loadRestClient } from "@mannsion/pangit";

export function env(name: string): string {
  const value = Deno.env.get(name);
  if (value === undefined || value.trim() === "") {
    throw new Error(`Set ${name} before running this example.`);
  }
  return value;
}

/** Response fields are often optional in Gitea's schema, including IDs needed by later steps. */
export function required<T>(value: T | null | undefined, field: string): T {
  if (value === undefined || value === null) {
    throw new Error(`Gitea did not return ${field}.`);
  }
  return value;
}

export function createClient() {
  return loadRestClient("gitea", "1.27.2", {
    // Include /api/v1 and any reverse-proxy prefix in this URL.
    baseUrl: env("GITEA_API_URL"),
    headers: { Authorization: `token ${env("GITEA_TOKEN")}` },
    headerForwarding: "same-origin",
    beforeRequest: (request) =>
      new Request(request, {
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]),
      }),
  });
}

export function repositoryPath() {
  return { owner: env("GITEA_OWNER"), repo: env("GITEA_REPO") };
}

/** Stop on an empty page: a server may cap the requested page size. */
export async function* paginate<T>(
  readPage: (page: number, limit: number) => Promise<readonly T[]>,
): AsyncGenerator<T> {
  for (let page = 1;; page++) {
    const items = await readPage(page, 50);
    if (items.length === 0) return;
    yield* items;
  }
}

/** Large int64 IDs can be bigint; stringify them without rounding or throwing. */
export function printJson(value: unknown): void {
  console.log(
    JSON.stringify(value, (_key, item) => typeof item === "bigint" ? String(item) : item, 2),
  );
}
