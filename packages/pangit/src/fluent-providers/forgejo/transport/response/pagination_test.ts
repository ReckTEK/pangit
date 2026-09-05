import { ProviderInvariantError } from "../../../../fluent-api/adapter-contract/errors.ts";
import { ForgejoAdapterContext } from "../ForgejoAdapterContext.ts";
import { forgejoPagination } from "./pagination.ts";
import type { ForgejoSuccessResponse } from "./operation.ts";

const context = new ForgejoAdapterContext("16.0.3", { baseUrl: "https://provider.invalid" });

for (
  const [name, page, count, headers] of [
    ["repeated next page", 2, 1, { link: '</entries?page=2>; rel="next"' }],
    ["backward next page", 2, 1, { link: '</entries?page=1>; rel="next"' }],
    ["empty continuing page", 1, 0, { link: '</entries?page=2>; rel="next"' }],
  ] as const
) {
  Deno.test(`Forgejo pagination rejects ${name}`, () => {
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
    } as unknown as ForgejoSuccessResponse;
    try {
      forgejoPagination(
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
        error.provider !== "forgejo" || error.operation !== "listEntries" ||
        error.cause !== response
      ) {
        throw new Error("Pagination failure lost provider evidence");
      }
    }
  });
}
