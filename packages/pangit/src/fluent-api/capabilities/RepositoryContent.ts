import type {
  FluentProvider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../adapter-contract/provider.ts";

import type {
  CommitFileChangesInput,
  CommitFileChangesOptions,
  ContentReadResult,
  ListDirectoryOptions,
  ReadContentBlobOptions,
  ReadContentOptions,
  ReadFileOptions,
  ReadFilesOptions,
  ReadLinkedContentOptions,
  ReadPathMetadataBatchOptions,
} from "../adapter-contract/content.ts";
import type { ValidationErrorContext } from "../adapter-contract/errors.ts";
import type { GitHostAdapter } from "../adapter-contract/GitHostAdapter.ts";
import { requireIdentity, requirePositiveInteger } from "../adapter-contract/operation-options.ts";
import type { RepositoryData } from "../adapter-contract/repositories.ts";
import { type Commit, createCommit } from "../entities/Commit.ts";
import { type Content, createContent } from "../entities/Content.ts";
import { validateContentBlobOptions } from "../content-body.ts";

import {
  createOperationExtension,
  type OperationExtension,
} from "../provider-extensions/OperationExtension.ts";

export type CommitFileChangesOperation<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = OperationExtension<
  "content.commitChanges",
  TProvider,
  TVersion,
  Commit<TProvider, TVersion, TRegistry>,
  TRegistry
>;

export interface ContentRead<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> extends Omit<ContentReadResult<TProvider, TVersion, TRegistry>, "content"> {
  readonly content?: Content<TProvider, TVersion, TRegistry>;
}

export interface RepositoryContent<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  /** Read a standard web Blob with a resolved MIME type. */
  readBlob(path: string, options?: ReadContentBlobOptions): Promise<globalThis.Blob>;
  /** Read a file as independent bytes. Always loads its body. */
  readBytes(path: string, options?: ReadFileOptions): Promise<Uint8Array>;
  /** Read a file as strict UTF-8 text. Empty files return an empty string. */
  readText(path: string, options?: ReadFileOptions): Promise<string>;
  /** Read UTF-8 JSON, returning unknown until the caller validates its shape. */
  readJson(path: string, options?: ReadFileOptions): Promise<unknown>;
  read(
    path: string,
    options?: ReadContentOptions,
  ): Promise<Content<TProvider, TVersion, TRegistry>>;
  readFiles(
    paths: readonly string[],
    options?: ReadFilesOptions,
  ): Promise<readonly ContentRead<TProvider, TVersion, TRegistry>[]>;
  getDirectory(
    path: string,
    options?: ReadContentOptions,
  ): Promise<Content<TProvider, TVersion, TRegistry>>;
  listDirectory(
    path: string,
    options?: ListDirectoryOptions,
  ): Promise<readonly Content<TProvider, TVersion, TRegistry>[]>;
  readPathMetadataBatch(
    paths: readonly string[],
    options?: ReadPathMetadataBatchOptions,
  ): Promise<readonly ContentRead<TProvider, TVersion, TRegistry>[]>;
  readSymlink(
    path: string,
    options?: ReadLinkedContentOptions,
  ): Promise<Content<TProvider, TVersion, TRegistry>>;
  readSubmodule(
    path: string,
    options?: ReadLinkedContentOptions,
  ): Promise<Content<TProvider, TVersion, TRegistry>>;
  commitChanges(
    input: CommitFileChangesInput,
  ): CommitFileChangesOperation<TProvider, TVersion, TRegistry>;
}

export function createRepositoryContent<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  adapter: GitHostAdapter<TProvider, TVersion, TRegistry>,
  repository: RepositoryData<TProvider, TVersion, TRegistry>,
): RepositoryContent<TProvider, TVersion, TRegistry> {
  const reads = (results: readonly ContentReadResult<TProvider, TVersion, TRegistry>[]) =>
    Object.freeze(results.map((result) =>
      Object.freeze({
        path: result.path,
        ...(result.content === undefined ? {} : { content: createContent(result.content) }),
        ...(result.unavailable === undefined ? {} : { unavailable: result.unavailable }),
      })
    ));
  return Object.freeze({
    async readBlob(path: string, options: ReadContentBlobOptions = {}) {
      const context = validationContext(adapter, "readContentBlob");
      validateRef(options.ref, context);
      validateContentBlobOptions(options, context);
      return await adapter.readContentBlob(
        repository,
        requireIdentity(path, "content path", context),
        options,
      );
    },
    async readBytes(path: string, options: ReadFileOptions = {}) {
      const context = validationContext(adapter, "readContentBytes");
      validateRef(options.ref, context);
      return await adapter.readContentBytes(
        repository,
        requireIdentity(path, "content path", context),
        options,
      );
    },
    async readText(path: string, options: ReadFileOptions = {}) {
      const context = validationContext(adapter, "readContentText");
      validateRef(options.ref, context);
      return await adapter.readContentText(
        repository,
        requireIdentity(path, "content path", context),
        options,
      );
    },
    async readJson(path: string, options: ReadFileOptions = {}) {
      const context = validationContext(adapter, "readContentJson");
      validateRef(options.ref, context);
      return await adapter.readContentJson(
        repository,
        requireIdentity(path, "content path", context),
        options,
      );
    },
    async read(path: string, options: ReadContentOptions = {}) {
      const context = validationContext(adapter, "readContent");
      validateRef(options.ref, context);
      return createContent(
        await adapter.readContent(
          repository,
          requireIdentity(path, "content path", context),
          options,
        ),
      );
    },
    async readFiles(paths: readonly string[], options: ReadFilesOptions = {}) {
      const context = validationContext(adapter, "readFiles");
      validateContentPaths(paths, context);
      validateBoundedOptions(options, context);
      validateRef(options.ref, context);
      return reads(await adapter.readFiles(repository, paths, options));
    },
    async getDirectory(path: string, options: ReadContentOptions = {}) {
      const context = validationContext(adapter, "getDirectory");
      validateDirectoryPath(path, context);
      validateRef(options.ref, context);
      return createContent(await adapter.getDirectory(repository, path, options));
    },
    async listDirectory(path: string, options: ListDirectoryOptions = {}) {
      const context = validationContext(adapter, "listDirectory");
      validateDirectoryPath(path, context);
      validateRef(options.ref, context);
      validateBoundedOptions(options, context);
      const traverses = options.recursive === true || options.collapseSingleFolders === true;
      if (traverses) {
        requirePositiveInteger(options.maxDepth ?? 0, "maximum directory depth", context);
      }
      if (options.recursive === true) {
        requirePositiveInteger(options.maxItems ?? 0, "maximum directory items", context);
      }
      return Object.freeze(
        (await adapter.listDirectory(repository, path, options)).map(createContent),
      );
    },
    async readPathMetadataBatch(
      paths: readonly string[],
      options: ReadPathMetadataBatchOptions = {},
    ) {
      const context = validationContext(adapter, "readPathMetadataBatch");
      validateContentPaths(paths, context);
      validateBoundedOptions(options, context);
      validateRef(options.ref, context);
      return reads(await adapter.readPathMetadataBatch(repository, paths, options));
    },
    async readSymlink(path: string, options: ReadLinkedContentOptions = {}) {
      const context = validationContext(adapter, "readSymlink");
      validateRef(options.ref, context);
      return createContent(
        await adapter.readSymlink(
          repository,
          requireIdentity(path, "symlink path", context),
          options,
        ),
      );
    },
    async readSubmodule(path: string, options: ReadLinkedContentOptions = {}) {
      const context = validationContext(adapter, "readSubmodule");
      validateRef(options.ref, context);
      return createContent(
        await adapter.readSubmodule(
          repository,
          requireIdentity(path, "submodule path", context),
          options,
        ),
      );
    },
    commitChanges(input: CommitFileChangesInput) {
      const operationInput: CommitFileChangesInput = {
        ...input,
        ...(input.author === undefined ? {} : { author: { ...input.author } }),
        changes: input.changes.map((change) =>
          "content" in change
            ? {
              ...change,
              // Copy bytes explicitly: structuredClone retains shared-buffer backing memory.
              content: typeof change.content === "string"
                ? change.content
                : Uint8Array.from(change.content),
            }
            : { ...change }
        ),
      };
      validateCommitFileChangesInput(
        operationInput,
        validationContext(adapter, "commitFileChanges"),
      );
      return createOperationExtension<
        "content.commitChanges",
        TProvider,
        TVersion,
        Commit<TProvider, TVersion, TRegistry>,
        TRegistry
      >({
        operation: "content.commitChanges",
        support: adapter.extensions["content.commitChanges"],
        validationContext: validationContext(adapter, "commitFileChanges"),
        provider: adapter.provider,
        version: adapter.version,
        context: Object.freeze({
          repositoryFullName: repository.fullName,
          branch: operationInput.branch,
          changeCount: operationInput.changes.length,
        }),
        execute: async (extension, options) =>
          createCommit(
            await adapter.commitFileChanges(repository, operationInput, {
              ...options,
              ...(extension === undefined ? {} : { extension }),
            } as CommitFileChangesOptions<TProvider, TRegistry>),
          ),
      });
    },
  });
}

function validateContentPaths(
  paths: readonly string[],
  context: ValidationErrorContext,
): void {
  for (const path of paths) requireIdentity(path, "content path", context);
}

function validateDirectoryPath(path: string, context: ValidationErrorContext): void {
  if (path === "" || path === "." || path === "/") return;
  requireIdentity(path, "directory path", context);
}

function validateRef(ref: string | undefined, context: ValidationErrorContext): void {
  if (ref !== undefined) requireIdentity(ref, "content ref", context);
}

function validateBoundedOptions(
  options: { readonly maxItems?: number; readonly concurrency?: number },
  context: ValidationErrorContext,
): void {
  if (options.maxItems !== undefined) {
    requirePositiveInteger(options.maxItems, "maximum content items", context);
  }
  if (options.concurrency !== undefined) {
    requirePositiveInteger(options.concurrency, "concurrency", context);
  }
}

function validateCommitFileChangesInput(
  input: CommitFileChangesInput,
  context: ValidationErrorContext,
): void {
  requireIdentity(input.branch, "file-change branch", context);
  if (input.newBranch !== undefined) {
    requireIdentity(input.newBranch, "new file-change branch", context);
  }
  requireIdentity(input.message, "file-change commit message", context);
  validateActor(input.author, "author", context);
  for (const change of input.changes) {
    requireIdentity(change.path, "file-change path", context);
    if (change.operation === "move") {
      requireIdentity(change.fromPath, "moved file source path", context);
    }
    if ("sha" in change && change.sha !== undefined) {
      requireIdentity(change.sha, "file SHA", context);
    }
  }
}

function validateActor(
  actor: CommitFileChangesInput["author"],
  label: string,
  context: ValidationErrorContext,
): void {
  if (actor?.name !== undefined) requireIdentity(actor.name, `${label} name`, context);
  if (actor?.email !== undefined) requireIdentity(actor.email, `${label} email`, context);
  if (actor?.date !== undefined) requireIdentity(actor.date, `${label} date`, context);
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
