# @branch-press/git

Deno-first REST clients for Azure DevOps, Bitbucket, Codeberg, Gitea, GitHub, and GitLab.

Each provider client is generated deterministically from a normalized OpenAPI 3.0.3 document. The
shared runtime uses Deno's native Fetch, URL, Headers, AbortSignal, FormData, Blob, and Web Streams
APIs with no runtime HTTP dependency.

## Use a generated client

```ts
import { GitHubRestClient, isRestSuccess } from "@branch-press/git";

const github = new GitHubRestClient({
  baseUrl: "https://api.github.com",
  headers: () => ({
    accept: "application/vnd.github+json",
    authorization: `Bearer ${Deno.env.get("GITHUB_TOKEN")}`,
  }),
});

const response = await github.reposGetContent({
  path: { owner: "octocat", repo: "Hello-World", path: "README" },
});

if (isRestSuccess(response)) {
  console.log(response.body);
}
```

Generated methods return status- and media-type-discriminated response unions together with the
native `Response`. Provider-scoped model and operation exports are available through
`AzureDevOpsApi`, `BitbucketApi`, `CodebergApi`, `GiteaApi`, `GitHubApi`, and `GitLabApi`.

The generated [REST client capability graph](docs/rest-client-capability-matrix.md) compares all
3,821 methods, reviewed cross-provider mappings, rejected false equivalents, and provider-specific
surfaces.

Use `client.rest.fetch(...)` for a raw native `Response`, or call
`client.rest.request(GitHubApi.gitHubOperations.reposGetContent, ...)` when an upstream endpoint
needs a lower-level escape hatch.

## Build provider API documents

```sh
deno task codegen
```

The codegen task downloads the current REST API descriptions for Gitea, GitHub, Codeberg, GitLab,
Bitbucket Cloud, and Azure DevOps Git into `codegen/specs/raw`. Provider-specific normalizers then
write consistent OpenAPI 3.0.3 JSON documents into `codegen/specs/normalized`. The client generator
then writes one client file per provider into `src/generated` and rebuilds the capability graph.

Run `deno task fetch`, `deno task normalize`, or `deno task generate` separately when only one stage
is needed. Run `deno task graph` to rebuild only the comparison document or `deno task graph:check`
to verify it is current. “Latest” follows the providers' maintained default branches or live API
document; it is intentionally not a reproducible version pin.
