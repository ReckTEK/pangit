import {
  ProviderInvariantError,
  ValidationError,
} from "../../../fluent-api/adapter-contract/errors.ts";
import { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import { packages } from "./operations.ts";

const identity = { owner: "group/project", type: "generic", name: "package", version: "1.0" };

Deno.test("GitLab package lookup bounds pages even when the server returns short pages", async () => {
  let requests = 0;
  const context = new GitLabAdapterContext("19.3.1", {
    baseUrl: "https://provider.invalid/api/v4",
    fetch() {
      if (++requests > 10) throw new Error("Package lookup exceeded its page bound");
      return Promise.resolve(
        Response.json([{
          id: requests,
          name: "unrelated",
          package_type: "generic",
          version: "1.0",
        }], { headers: { "x-next-page": String(requests + 1) } }),
      );
    },
  });
  try {
    await packages(context).findPackageVersion(identity);
    throw new Error("Incomplete package lookup was reported as complete");
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error;
  }
  if (requests !== 10) throw new Error(`Expected 10 bounded pages, got ${requests}`);
});

Deno.test("GitLab package files reject empty continuing pages instead of looping", async () => {
  let fileRequests = 0;
  const context = new GitLabAdapterContext("19.3.1", {
    baseUrl: "https://provider.invalid/api/v4",
    fetch(input, init) {
      const request = new Request(input, init);
      if (new URL(request.url).pathname.endsWith("/package_files")) {
        if (++fileRequests > 1) throw new Error("Repeated an empty continuing package-file page");
        return Promise.resolve(Response.json([], { headers: { "x-next-page": "2" } }));
      }
      return Promise.resolve(Response.json([
        { id: 1, name: identity.name, version: identity.version, package_type: identity.type },
      ], { headers: { "x-next-page": "" } }));
    },
  });
  try {
    await packages(context).listPackageFiles(identity, { maxFiles: 2 });
    throw new Error("Incomplete package files were reported as complete");
  } catch (error) {
    if (!(error instanceof ProviderInvariantError)) throw error;
  }
  if (fileRequests !== 1) throw new Error("Expected one failed package-file page");
});
