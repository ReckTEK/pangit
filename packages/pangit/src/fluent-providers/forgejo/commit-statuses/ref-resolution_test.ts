import type { ForgejoProviderTypes } from "../provider-types.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import {
  getForgejoCommitStatus,
  listForgejoCommitStatuses,
  setForgejoCommitStatus,
} from "./operations.ts";

for (const version of ["15.0.7", "16.0.3"] as const) {
  Deno.test(`Forgejo ${version} uses peeled commits for named status reads and writes`, async () => {
    const sha = "a".repeat(40);
    const paths: string[] = [];
    const status = { id: 1, context: "ci", status: "success" };
    const context = new ForgejoAdapterContext(version, {
      baseUrl: "https://forgejo.invalid/api/v1",
      fetch(input, init) {
        const request = new Request(input, init);
        const path = new URL(request.url).pathname;
        paths.push(path);
        if (path.endsWith("/git/commits/annotated-tag")) {
          return Promise.resolve(Response.json({ sha }));
        }
        if (path.endsWith(`/statuses/${sha}`) && request.method === "POST") {
          return Promise.resolve(Response.json(status, { status: 201 }));
        }
        if (path.endsWith(`/commits/${sha}/status`)) {
          return Promise.resolve(
            Response.json({ state: "success", statuses: [status], total_count: 1 }),
          );
        }
        if (path.endsWith(`/commits/${sha}/statuses`)) {
          return Promise.resolve(Response.json([status]));
        }
        throw new Error(`Unresolved status reference sent to the server: ${path}`);
      },
    });
    const repository = {
      id: "1",
      owner: "sandbox",
      name: "project",
      fullName: "sandbox/project",
      native: null as never,
    } satisfies RepositoryData<"forgejo", typeof version, ForgejoProviderTypes>;
    await setForgejoCommitStatus(context, repository, "annotated-tag", {
      context: "ci",
      state: "success",
    });
    const combined = await getForgejoCommitStatus(context, repository, "annotated-tag");
    const page = await listForgejoCommitStatuses(context, repository, "annotated-tag", {
      limit: 10,
    });
    if (paths.length !== 6 || combined.statuses.length !== 1 || page.items.length !== 1) {
      throw new Error("named status mapping changed");
    }
    paths.length = 0;
    await getForgejoCommitStatus(context, repository, sha);
    if (paths.length !== 1) throw new Error("known commit lookup performed extra requests");
  });
}
