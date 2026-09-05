import { GitLabAdapterContext } from "./GitLabAdapterContext.ts";
import { page } from "./pagination.ts";

Deno.test("GitLab continuation preserves the server's effective page size", async () => {
  const payloads = Array.from({ length: 51 }, (_, id) => ({ id }));
  const limits: number[] = [];
  const context = new GitLabAdapterContext("19.3.1", {
    baseUrl: "https://provider.invalid/api/v4",
    fetch(input, init) {
      const query = new URL(new Request(input, init).url).searchParams;
      const page = Number(query.get("page"));
      const requested = Number(query.get("per_page"));
      limits.push(requested);
      const limit = Math.min(20, requested);
      return Promise.resolve(Response.json(payloads.slice((page - 1) * limit, page * limit), {
        headers: {
          "x-page": String(page),
          "x-per-page": String(limit),
          "x-total": String(payloads.length),
        },
      }));
    },
  });
  let cursor: string | undefined;
  const ids: unknown[] = [];
  do {
    const result = await page(
      context,
      "listCommits",
      "getApiV4ProjectsIdRepositoryCommits",
      {
        path: { id: "1" },
      },
      { limit: 50, cursor },
      (row) => row.id,
    );
    ids.push(...result.items);
    cursor = result.nextCursor;
    if (limits.length > 3) throw new Error("Pagination did not terminate");
  } while (cursor);
  if (ids.length !== 51 || new Set(ids).size !== 51 || limits.join() !== "50,20,20") {
    throw new Error("Pagination ignored the provider's effective page size");
  }
});
