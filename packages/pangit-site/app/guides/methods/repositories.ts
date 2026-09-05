import type * as api from "@recktek/pangit/api";
import type { MethodDescriptions } from "../mod.ts";

export const client = {
  title: "git",
  source: "fluent-api/client/FluentClient.ts",
  methods: {
    "containers":
      "containers(request?) \u2192 Page<RepositoryContainer>. Fetch one page of owners visible to the current client.",
    "container":
      "container(name, options?) \u2192 RepositoryContainer. Fetch one owner by name or namespace path.",
  } satisfies MethodDescriptions<api.FluentClient<"gitea", "1.27.2">>,
};

export const owners = {
  title: "owner",
  source: "fluent-api/entities/RepositoryContainer.ts",
  methods: {
    "repositories":
      "repositories(request?) \u2192 Page<Repository>. Fetch one page; pass limit and cursor to continue.",
    "repository":
      "repository(name, options?) \u2192 Repository. Fetch a repository or throw NotFoundError.",
    "findRepository":
      "findRepository(name, options?) \u2192 Repository | undefined. Only a not-found result becomes undefined; permission and other errors still throw.",
    "hasRepository":
      "hasRepository(name, options?) \u2192 boolean. Test existence without converting unrelated errors to false.",
    "createRepository":
      "createRepository(name, options?) \u2192 Repository. Options include description, private, initialize, defaultBranch, initialCommitMessage, files, and signal.",
  } satisfies MethodDescriptions<api.RepositoryContainer<"gitea", "1.27.2">>,
};

export const repositories = {
  title: "repo",
  source: "fluent-api/entities/Repository.ts",
  methods: {
    "rename":
      "rename(name, options?) \u2192 Repository. Return a new snapshot with the new identity.",
    "delete": "delete(options?) \u2192 void. Delete the repository on the provider.",
  } satisfies MethodDescriptions<api.Repository<"gitea", "1.27.2">>,
};

export const forks = {
  title: "repo.forks",
  source: "fluent-api/capabilities/RepositoryForks.ts",
  methods: {
    "list": "list(request?) \u2192 Page<Repository>. Fetch one page of forks.",
    "create":
      "create({ destination, name?, timeoutMs?, pollIntervalMs?, signal? }) \u2192 Repository. Fork into a fetched container and poll that known destination until directly usable.",
  } satisfies MethodDescriptions<api.RepositoryForks<"gitea", "1.27.2">>,
};

export const profile = {
  title: "git.currentUserProfile",
  source: "fluent-api/capabilities/optional/CurrentUserProfile.ts",
  methods: {
    "current":
      "current(options?) \u2192 CurrentUserProfile. Fetch the authenticated identity; inspect support.supported before using this optional capability.",
  } satisfies MethodDescriptions<api.CurrentUserProfileCapability<"gitea", "1.27.2">>,
};
