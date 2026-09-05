import { ValidationError } from "../../../fluent-api/adapter-contract/errors.ts";
import { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import { listForgejoContributors } from "./list-contributors.ts";
import { findForgejoRefsForCommit } from "./find-refs.ts";

for (const operation of ["contributors", "refs"] as const) {
  Deno.test(`Forgejo ${operation} reject a continuation larger than maxItems before HTTP`, async () => {
    let requests = 0;
    const context = new ForgejoAdapterContext("16.0.3", {
      baseUrl: "https://provider.invalid",
      fetch() {
        requests++;
        throw new Error("Exceeded the caller's inspection bound");
      },
    });
    const repository = {
      id: "1",
      owner: "owner",
      name: "repo",
      fullName: "owner/repo",
      defaultBranch: "main",
      native: {
        forgejo: (): Promise<never> => Promise.reject(new Error("Unexpected native access")),
      },
    };
    const pageCursor = "forgejo-page:2:50";
    const cursor = operation === "refs"
      ? `forgejo-refs:branch:${encodeURIComponent(pageCursor)}`
      : pageCursor;
    const request = {
      limit: 50,
      maxItems: 5,
      cursor,
      kinds: ["branch" as const],
      match: "head" as const,
    };
    try {
      await (operation === "contributors"
        ? listForgejoContributors(context, repository, request)
        : findForgejoRefsForCommit(context, repository, "a".repeat(40), request));
      throw new Error("Oversized scan was accepted");
    } catch (error) {
      if (!(error instanceof ValidationError)) throw error;
    }
    if (requests !== 0) throw new Error("Scan rejected the bound after starting HTTP");
  });
}
