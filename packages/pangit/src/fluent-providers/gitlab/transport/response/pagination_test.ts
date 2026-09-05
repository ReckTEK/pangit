import { ProviderInvariantError } from "../../../../fluent-api/adapter-contract/errors.ts";
import { GitLabAdapterContext } from "../GitLabAdapterContext.ts";
import { gitlabPagination } from "./pagination.ts";
import type { GitLabSuccessResponse } from "./operation.ts";

const context = new GitLabAdapterContext("19.3.1", { baseUrl: "https://provider.invalid" });

for (
  const [name, page, count, headers] of [
    ["repeated next page", 2, 1, { link: '</entries?page=2>; rel="next"' }],
    ["backward next page", 2, 1, { link: '</entries?page=1>; rel="next"' }],
    ["empty continuing page", 1, 0, { link: '</entries?page=2>; rel="next"' }],
    ["repeated next-page header", 2, 1, { "x-next-page": "2" }],
    ["backward next-page header", 2, 1, { "x-next-page": "1" }],
    ["invalid next-page header", 2, 1, { "x-next-page": "garbage" }],
    ["unsafe next-page header", 2, 1, { "x-next-page": "9999999999999999999" }],
  ] as const
) {
  Deno.test(`GitLab pagination rejects ${name}`, () => {
    const response = {
      ok: true,
      documented: true,
      status: 200,
      body: [],
      headers: new Headers(headers),
      headerValues: {},
      mediaType: "application/json",
      response: new Response(null),
      operation: { id: "fixture", method: "GET", path: "/entries", responses: [] },
    } as unknown as GitLabSuccessResponse;
    try {
      gitlabPagination(
        context,
        { universal: "listEntries" },
        response,
        { page, effectiveLimit: 10 },
        10,
        count,
      );
      throw new Error("Invalid continuation was accepted");
    } catch (error) {
      if (!(error instanceof ProviderInvariantError)) throw error;
      if (
        error.provider !== "gitlab" || error.operation !== "listEntries" || error.cause !== response
      ) {
        throw new Error("Pagination failure lost provider evidence");
      }
    }
  });
}
