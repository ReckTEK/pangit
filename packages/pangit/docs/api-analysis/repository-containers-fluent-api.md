# Repository-container fluent API

Status: the universal repository-container contract and Gitea adapter are implemented. Other
providers implement the same adapter contract before these operations become available for them. The
reviewed capability semantics and native bindings remain authoritative in [Common core](core.md) and
the [provider method map](core-method-map.md).

## Consumer contract

```ts
import * as PanGit from "@mannsion/pangit";

const connection = PanGit.api.createClient(
  "gitea",
  "1.27.2",
  "https://git.example.com/api/v1",
);
const git = await connection.auth.token(token);

const owner = await git.container("acme");
const repositories = await owner.repositories();
const website = await owner.repository("website");
const optionalWebsite = await owner.findRepository("website");
const websiteExists = await owner.hasRepository("website");

const created = await owner.createRepository("new-site", {
  private: true,
  initialize: true,
  defaultBranch: "main",
});
const renamed = await created.rename("public-site");
await renamed.delete();

const nativeFullName = await website.native.gitea(({ repository }) => repository.full_name);
```

The grammar is deliberately small:

- `container(name)` resolves one explicit repository-owning scope.
- `containers()` discovers the authenticated identity and its membership scopes.
- Repository methods live on the owning container.
- `repository(name)` requires the repository to exist.
- `findRepository(name)` returns `undefined` only for confirmed absence.
- `hasRepository(name)` checks existence without listing the container.
- Mutations live on the entity they affect.
- Required identities are direct parameters; optional settings use one trailing options object.

## A container is an owner, not an organization alias

The universal noun is `RepositoryContainer` because providers use different owning scopes:

| Provider family  | Repository-owning container                 |
| ---------------- | ------------------------------------------- |
| Gitea / Codeberg | Named user account or organization          |
| GitHub           | Organization                                |
| GitLab           | Group                                       |
| Bitbucket Cloud  | Workspace                                   |
| Azure DevOps     | Project within an Azure DevOps organization |

The container retains its normalized `kind` and exact native payload. PanGit does not relabel a
user, group, workspace, or project as an organization.

Repository listing always belongs to one fetched container. It is never a global, account-wide, or
access-wide repository search. Exact lookup and existence checks use the provider's direct
repository operation rather than downloading every repository and searching in memory.

## One universal adapter contract

The common client never switches on the provider for individual operations. `createClient` selects
and memoizes one lazy adapter from the provider key. Every container and repository delegates to
that adapter:

```ts
interface RepositoryProviderAdapter<Provider, Version> {
  authorizeToken(token, tokenType?, signal?): Promise<this>;

  containers(): Promise<readonly RepositoryContainerData[]>;
  container(name: string): Promise<RepositoryContainerData>;

  containerRepositories(container): Promise<readonly RepositoryData[]>;
  containerRepository(container, name): Promise<RepositoryData>;
  findContainerRepository(container, name): Promise<RepositoryData | undefined>;
  createContainerRepository(container, name, options): Promise<RepositoryData>;

  renameRepository(repository, name): Promise<RepositoryData>;
  deleteRepository(repository): Promise<void>;
}
```

Provider-specific native method selection lives only inside that provider's adapter. Generated
provider modules remain lazy and load only after their provider is selected.

## Current Gitea mapping

Gitea implements both supported owning-container kinds through the same adapter:

| Universal operation         | Gitea user container                         | Gitea organization container |
| --------------------------- | -------------------------------------------- | ---------------------------- |
| container discovery         | `userGetCurrent`                             | `orgListCurrentUserOrgs`     |
| container lookup            | `userGet`                                    | `orgGet`                     |
| repository listing          | `userCurrentListRepos` or `userListRepos`    | `orgListRepos`               |
| required repository lookup  | `repoGet`                                    | `repoGet`                    |
| optional lookup / existence | `repoGet`, with HTTP `404` as absence        | same                         |
| repository creation         | `createCurrentUserRepo` for the current user | `createOrgRepo`              |
| repository rename           | `repoEdit`                                   | `repoEdit`                   |
| repository delete           | `repoDelete`                                 | `repoDelete`                 |

The Gitea adapter resolves a name to its real user or organization payload. User-owned repository
creation is accepted only when the authorized Gitea user owns that container.

## Exact generated types stay exact

Normalized entities contain only shared fields. Their `native.gitea` doors retain the exact
generated client and payload for the selected Gitea version. The universal contract does not copy or
flatten generated OpenAPI schemas.

## Section boundary

This contract owns repository containers, repository identity, lookup, existence, creation, rename,
and deletion. Branches, tags, commits, content, pull requests, and statuses are separate contracts
attached to a fetched `Repository` as they are implemented.
