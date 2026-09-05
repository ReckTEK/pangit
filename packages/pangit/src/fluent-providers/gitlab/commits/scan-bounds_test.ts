import { ValidationError } from "../../../fluent-api/adapter-contract/errors.ts";
import { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import { commits } from "./operations.ts";

for (const operation of ["contributors", "refs"] as const) {
  Deno.test(`GitLab ${operation} reject a continuation larger than maxItems before HTTP`, async () => {
    let requests = 0;
    const context = new GitLabAdapterContext("19.3.1", {
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
        gitlab: (): Promise<never> => Promise.reject(new Error("Unexpected native access")),
      },
    };
    const cursor = "gitlab-page:2:50";
    const request = {
      limit: 50,
      maxItems: 5,
      cursor,
      kinds: ["branch" as const],
      match: "head" as const,
    };
    try {
      await (operation === "contributors"
        ? commits(context).listContributors(repository, request)
        : commits(context).findRefsForCommit(repository, "a".repeat(40), request));
      throw new Error("Oversized scan was accepted");
    } catch (error) {
      if (!(error instanceof ValidationError)) throw error;
    }
    if (requests !== 0) throw new Error("Scan rejected the bound after starting HTTP");
  });
}

Deno.test("GitLab ref discovery honors inspection and concurrency bounds on the first page", async () => {
  let active = 0, maximum = 0, pageLimit = 0;
  const sha = "a".repeat(40);
  const context = new GitLabAdapterContext("19.3.1", {
    baseUrl: "https://provider.invalid/api/v4",
    async fetch(input, init) {
      const url = new URL(new Request(input, init).url);
      if (url.pathname.endsWith("/refs")) {
        pageLimit = Number(url.searchParams.get("per_page"));
        return Response.json([{ type: "branch", name: "one" }, { type: "branch", name: "two" }], {
          headers: { "x-next-page": "" },
        });
      }
      active++;
      maximum = Math.max(maximum, active);
      await Promise.resolve();
      active--;
      return Response.json({ commit: { id: sha } });
    },
  });
  const result = await commits(context).findRefsForCommit(
    {
      id: "1",
      owner: "owner",
      name: "repo",
      fullName: "owner/repo",
      native: {
        gitlab: (): Promise<never> => Promise.reject(new Error("Unexpected native access")),
      },
    },
    sha,
    { limit: 50, maxItems: 2, concurrency: 1, kinds: ["branch"], match: "head" },
  );
  if (pageLimit !== 2 || maximum !== 1 || result.items.length !== 2) {
    throw new Error("Ref discovery exceeded its caller bounds");
  }
});
