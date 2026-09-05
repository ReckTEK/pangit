import type {
  FluentProvider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../adapter-contract/provider.ts";

import type {
  CombinedCommitStatus,
  CommitStatusReference,
  SetCommitStatusInput,
  SetCommitStatusOptions,
} from "../adapter-contract/commit-statuses.ts";
import type { GitHostAdapter } from "../adapter-contract/GitHostAdapter.ts";
import { ValidationError, type ValidationErrorContext } from "../adapter-contract/errors.ts";
import { type OperationOptions, requireIdentity } from "../adapter-contract/operation-options.ts";

import {
  createPage,
  type Page,
  type PageRequest,
  resolvePageRequest,
} from "../adapter-contract/pagination.ts";

import type { RepositoryData } from "../adapter-contract/repositories.ts";
import { type CommitStatus, createCommitStatus } from "../entities/CommitStatus.ts";

import {
  createOperationExtension,
  type OperationExtension,
} from "../provider-extensions/OperationExtension.ts";

export type SetCommitStatusOperation<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = OperationExtension<
  "statuses.set",
  TProvider,
  TVersion,
  CommitStatus<TProvider, TVersion, TRegistry>,
  TRegistry
>;

export interface CombinedStatus<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> extends Omit<CombinedCommitStatus<TProvider, TVersion, TRegistry>, "statuses"> {
  readonly statuses: readonly CommitStatus<TProvider, TVersion, TRegistry>[];
}

export interface RepositoryCommitStatuses<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  list(
    reference: CommitStatusReference,
    request?: PageRequest,
  ): Promise<Page<CommitStatus<TProvider, TVersion, TRegistry>>>;
  get(
    reference: CommitStatusReference,
    options?: OperationOptions,
  ): Promise<CombinedStatus<TProvider, TVersion, TRegistry>>;
  set(
    reference: CommitStatusReference,
    input: SetCommitStatusInput,
  ): SetCommitStatusOperation<TProvider, TVersion, TRegistry>;
}

export function createRepositoryCommitStatuses<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  adapter: GitHostAdapter<TProvider, TVersion, TRegistry>,
  repository: RepositoryData<TProvider, TVersion, TRegistry>,
): RepositoryCommitStatuses<TProvider, TVersion, TRegistry> {
  return Object.freeze({
    async list(reference: CommitStatusReference, request: PageRequest = {}) {
      const context = validationContext(adapter, "listCommitStatuses");
      const resolvedRequest = resolvePageRequest(request, 50, context);
      const page = await adapter.listCommitStatuses(
        repository,
        await resolveStatusReference(
          adapter,
          repository,
          reference,
          resolvedRequest,
          context,
        ),
        resolvedRequest,
      );
      return createPage(page.items.map(createCommitStatus), page);
    },
    async get(
      reference: CommitStatusReference,
      options: OperationOptions = {},
    ) {
      const context = validationContext(adapter, "getCommitStatus");
      const combined = await adapter.getCommitStatus(
        repository,
        await resolveStatusReference(
          adapter,
          repository,
          reference,
          options,
          context,
        ),
        options,
      );
      return Object.freeze({
        ref: combined.ref,
        state: combined.state,
        providerState: combined.providerState,
        statuses: Object.freeze(combined.statuses.map(createCommitStatus)),
        ...(combined.totalCount === undefined ? {} : { totalCount: combined.totalCount }),
      });
    },
    set(reference: CommitStatusReference, input: SetCommitStatusInput) {
      const operationInput = structuredClone(input);
      const context = validationContext(adapter, "setCommitStatus");
      const target = validateStatusReference(reference, context);
      const statusContext = requireIdentity(
        operationInput.context,
        "status context",
        context,
      );
      if (
        operationInput.state !== "pending" &&
        operationInput.state !== "success" &&
        operationInput.state !== "failure"
      ) {
        throw new ValidationError(
          "invalid portable commit-status state",
          context,
        );
      }
      return createOperationExtension<
        "statuses.set",
        TProvider,
        TVersion,
        CommitStatus<TProvider, TVersion, TRegistry>,
        TRegistry
      >({
        operation: "statuses.set",
        support: adapter.extensions["statuses.set"],
        validationContext: context,
        provider: adapter.provider,
        version: adapter.version,
        context: Object.freeze({
          repositoryFullName: repository.fullName,
          reference: target,
          context: statusContext,
          portableState: operationInput.state,
        }),
        execute: async (extension, options) => {
          const resolvedReference = await resolveStatusReference(
            adapter,
            repository,
            target,
            options,
            context,
          );
          return createCommitStatus(
            await adapter.setCommitStatus(
              repository,
              resolvedReference,
              operationInput,
              {
                ...options,
                ...(extension === undefined ? {} : { extension }),
              } as SetCommitStatusOptions<TProvider, TRegistry>,
            ),
          );
        },
      });
    },
  });
}

function validateStatusReference(
  reference: CommitStatusReference,
  context: ValidationErrorContext,
): CommitStatusReference {
  switch (reference.kind) {
    case "commit":
      return Object.freeze({
        kind: reference.kind,
        sha: requireIdentity(reference.sha, "commit SHA", context),
      });
    case "branch":
    case "tag":
      return Object.freeze({
        kind: reference.kind,
        name: requireIdentity(
          reference.name,
          `${reference.kind} name`,
          context,
        ),
      });
    case "pullRequestHead":
      if (!Number.isSafeInteger(reference.number) || reference.number <= 0) {
        throw new ValidationError(
          "pull-request number must be a positive safe integer",
          context,
        );
      }
      return Object.freeze({ kind: reference.kind, number: reference.number });
    default:
      throw new ValidationError(
        "invalid commit-status reference kind",
        context,
      );
  }
}

async function resolveStatusReference<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  adapter: GitHostAdapter<TProvider, TVersion, TRegistry>,
  repository: RepositoryData<TProvider, TVersion, TRegistry>,
  reference: CommitStatusReference,
  options: OperationOptions,
  context: ValidationErrorContext,
): Promise<string> {
  const target = validateStatusReference(reference, context);
  switch (target.kind) {
    case "commit":
      return target.sha;
    case "branch":
    case "tag":
      return target.name;
    case "pullRequestHead": {
      const pullRequest = await adapter.getPullRequest(
        repository,
        target.number,
        options,
      );
      return requireIdentity(
        pullRequest.source.sha ?? "",
        "pull-request head SHA",
        context,
      );
    }
  }
}

function validationContext<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  adapter: GitHostAdapter<TProvider, TVersion, TRegistry>,
  operation: string,
): ValidationErrorContext<TProvider, TVersion> {
  return { provider: adapter.provider, version: adapter.version, operation };
}
