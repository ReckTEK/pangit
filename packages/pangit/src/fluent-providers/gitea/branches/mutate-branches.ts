import type {
  BranchData,
  CreateBranchInput,
} from "../../../fluent-api/adapter-contract/branches.ts";
import { ValidationError } from "../../../fluent-api/adapter-contract/errors.ts";
import {
  type OperationOptions,
  requireIdentity,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";
import { requestGitea, requestGiteaBody } from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import { type AnyGiteaBranch, isBranchPayload, normalizeGiteaBranch } from "./normalize-branch.ts";

/** Create one branch directly from the caller's explicit ref or SHA. */
export async function createGiteaBranch<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  input: CreateBranchInput,
  options: OperationOptions = {},
): Promise<BranchData<"gitea", TVersion>> {
  const operation = { universal: "createBranch", native: "repoCreateBranch" } as const;
  const name = requireIdentity(input.name, "new branch name");
  const source = requireIdentity(input.source, "branch source");
  const path = repositoryPath(repository);
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaBranch, TVersion>(
    context,
    operation,
    () =>
      client.repoCreateBranch(
        {
          path,
          body: {
            mediaType: "application/json",
            value: { new_branch_name: name, old_ref_name: source },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isBranchPayload,
  );
  return normalizeGiteaBranch(client, payload);
}

/** Rename one non-default branch with the provider's direct 204 mutation. */
export async function renameGiteaBranch<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  branch: BranchData<"gitea", TVersion>,
  name: string,
  options: OperationOptions = {},
): Promise<void> {
  const operation = { universal: "renameBranch", native: "repoRenameBranch" } as const;
  assertMutableBranch(context, repository, branch, "renameBranch");
  const newName = requireIdentity(name, "renamed branch name");
  const path = repositoryPath(repository);
  const branchName = requireIdentity(branch.name, "branch name");
  const client = await context.client();
  await requestGitea(
    context,
    operation,
    () =>
      client.repoRenameBranch(
        {
          path: { ...path, branch: branchName },
          body: { mediaType: "application/json", value: { name: newName } },
        },
        requestOptions(options.signal),
      ),
    options.signal,
  );
}

/** Delete one non-default branch directly. */
export async function deleteGiteaBranch<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  branch: BranchData<"gitea", TVersion>,
  options: OperationOptions = {},
): Promise<void> {
  const operation = { universal: "deleteBranch", native: "repoDeleteBranch" } as const;
  assertMutableBranch(context, repository, branch, "deleteBranch");
  const path = repositoryPath(repository);
  const branchName = requireIdentity(branch.name, "branch name");
  const client = await context.client();
  await requestGitea(
    context,
    operation,
    () =>
      client.repoDeleteBranch(
        { path: { ...path, branch: branchName } },
        requestOptions(options.signal),
      ),
    options.signal,
  );
}

function assertMutableBranch<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  branch: BranchData<"gitea", TVersion>,
  operation: string,
): void {
  if (repository.defaultBranch !== undefined && branch.name === repository.defaultBranch) {
    throw new ValidationError(`cannot ${operation} for default branch ${branch.name}`, {
      provider: "gitea",
      version: context.version,
      operation,
    });
  }
}
