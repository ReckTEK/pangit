import type { ForgejoProviderTypes } from "../provider-types.ts";
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
import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import { requestForgejo, requestForgejoBody } from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import {
  type AnyForgejoBranch,
  isBranchPayload,
  normalizeForgejoBranch,
} from "./normalize-branch.ts";

/** Create one branch directly from the caller's explicit ref or SHA. */
export async function createForgejoBranch<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  input: CreateBranchInput,
  options: OperationOptions = {},
): Promise<BranchData<"forgejo", TVersion, ForgejoProviderTypes>> {
  const operation = { universal: "createBranch", native: "repoCreateBranch" } as const;
  const name = requireIdentity(input.name, "new branch name");
  const source = requireIdentity(input.source, "branch source");
  const path = repositoryPath(repository);
  const client = await context.client();
  const payload = await requestForgejoBody<AnyForgejoBranch, TVersion>(
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
  return normalizeForgejoBranch(client, payload);
}

/** Rename one non-default branch with the provider's direct 204 mutation. */
export async function renameForgejoBranch<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  branch: BranchData<"forgejo", TVersion, ForgejoProviderTypes>,
  name: string,
  options: OperationOptions = {},
): Promise<void> {
  const operation = { universal: "renameBranch", native: "repoUpdateBranch" } as const;
  assertMutableBranch(context, repository, branch, "renameBranch");
  const newName = requireIdentity(name, "renamed branch name");
  const path = repositoryPath(repository);
  const branchName = requireIdentity(branch.name, "branch name");
  const client = await context.client();
  await requestForgejo(
    context,
    operation,
    () =>
      client.repoUpdateBranch(
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
export async function deleteForgejoBranch<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  branch: BranchData<"forgejo", TVersion, ForgejoProviderTypes>,
  options: OperationOptions = {},
): Promise<void> {
  const operation = { universal: "deleteBranch", native: "repoDeleteBranch" } as const;
  assertMutableBranch(context, repository, branch, "deleteBranch");
  const path = repositoryPath(repository);
  const branchName = requireIdentity(branch.name, "branch name");
  const client = await context.client();
  await requestForgejo(
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

function assertMutableBranch<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  branch: BranchData<"forgejo", TVersion, ForgejoProviderTypes>,
  operation: string,
): void {
  if (repository.defaultBranch !== undefined && branch.name === repository.defaultBranch) {
    throw new ValidationError(`cannot ${operation} for default branch ${branch.name}`, {
      provider: "forgejo",
      version: context.version,
      operation,
    });
  }
}
