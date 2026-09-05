import type {
  FluentProvider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../../adapter-contract/provider.ts";

import type { ValidationErrorContext } from "../../adapter-contract/errors.ts";
import {
  type OperationOptions,
  requireIdentity,
  requirePositiveInteger,
} from "../../adapter-contract/operation-options.ts";

import {
  createPage,
  type Page,
  type PageRequest,
  resolvePageRequest,
} from "../../adapter-contract/pagination.ts";

import type {
  ListPackageFilesOptions,
  PackageAdapter,
  PackageCapabilitySupport,
  PackageCoordinates,
  PackageVersionIdentity,
} from "../../adapter-contract/optional/packages.ts";
import {
  createPackageFile,
  createPackageVersion,
  type PackageFile,
  type PackageVersion,
} from "../../entities/optional/Package.ts";

export interface ListPackagesOptions extends PageRequest {
  readonly query?: string;
  readonly type?: string;
}

export interface Packages<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly support: PackageCapabilitySupport;
  list(
    owner: string,
    options?: ListPackagesOptions,
  ): Promise<Page<PackageVersion<TProvider, TVersion, TRegistry>>>;
  versions(
    coordinates: PackageCoordinates,
    request?: PageRequest,
  ): Promise<Page<PackageVersion<TProvider, TVersion, TRegistry>>>;
  get(
    identity: PackageVersionIdentity,
    options?: OperationOptions,
  ): Promise<PackageVersion<TProvider, TVersion, TRegistry>>;
  find(
    identity: PackageVersionIdentity,
    options?: OperationOptions,
  ): Promise<PackageVersion<TProvider, TVersion, TRegistry> | undefined>;
  files(
    identity: PackageVersionIdentity,
    options: ListPackageFilesOptions,
  ): Promise<readonly PackageFile<TProvider, TVersion, TRegistry>[]>;
  deleteVersion(identity: PackageVersionIdentity, options?: OperationOptions): Promise<void>;
  delete(coordinates: PackageCoordinates, options?: OperationOptions): Promise<void>;
}

export function createPackages<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  adapter: PackageAdapter<TProvider, TVersion, TRegistry>,
): Packages<TProvider, TVersion, TRegistry> {
  return Object.freeze({
    support: adapter.packageSupport,
    async list(owner: string, options: ListPackagesOptions = {}) {
      const context = adapterValidationContext(adapter, "listPackages");
      validatePageLimit(options, context);
      const page = await adapter.listPackages(requireIdentity(owner, "package owner", context), {
        ...resolvePageRequest(options, 50, context),
        ...(options.query === undefined
          ? {}
          : { query: requireIdentity(options.query, "package query", context) }),
        ...(options.type === undefined
          ? {}
          : { type: requireIdentity(options.type, "package type", context) }),
      });
      return createPage(page.items.map(createPackageVersion), page);
    },
    async versions(coordinates: PackageCoordinates, request: PageRequest = {}) {
      const context = adapterValidationContext(adapter, "listPackageVersions");
      validatePageLimit(request, context);
      const page = await adapter.listPackageVersions(
        validateCoordinates(coordinates, context),
        resolvePageRequest(request, 50, context),
      );
      return createPage(page.items.map(createPackageVersion), page);
    },
    async get(identity: PackageVersionIdentity, options: OperationOptions = {}) {
      const context = adapterValidationContext(adapter, "getPackageVersion");
      return createPackageVersion(
        await adapter.getPackageVersion(validateIdentity(identity, context), options),
      );
    },
    async find(identity: PackageVersionIdentity, options: OperationOptions = {}) {
      const context = adapterValidationContext(adapter, "findPackageVersion");
      const found = await adapter.findPackageVersion(validateIdentity(identity, context), options);
      return found === undefined ? undefined : createPackageVersion(found);
    },
    async files(identity: PackageVersionIdentity, options: ListPackageFilesOptions) {
      const context = adapterValidationContext(adapter, "listPackageFiles");
      requirePositiveInteger(options.maxFiles, "maximum package files", context);
      const files = await adapter.listPackageFiles(validateIdentity(identity, context), options);
      return Object.freeze(files.map(createPackageFile));
    },
    deleteVersion(identity: PackageVersionIdentity, options: OperationOptions = {}) {
      const context = adapterValidationContext(adapter, "deletePackageVersion");
      return adapter.deletePackageVersion(validateIdentity(identity, context), options);
    },
    delete(coordinates: PackageCoordinates, options: OperationOptions = {}) {
      const context = adapterValidationContext(adapter, "deletePackage");
      return adapter.deletePackage(validateCoordinates(coordinates, context), options);
    },
  });
}

function validateCoordinates(
  coordinates: PackageCoordinates,
  context: ValidationErrorContext,
): PackageCoordinates {
  return Object.freeze({
    owner: requireIdentity(coordinates.owner, "package owner", context),
    type: requireIdentity(coordinates.type, "package type", context),
    name: requireIdentity(coordinates.name, "package name", context),
  });
}

function validateIdentity(
  identity: PackageVersionIdentity,
  context: ValidationErrorContext,
): PackageVersionIdentity {
  return Object.freeze({
    ...validateCoordinates(identity, context),
    version: requireIdentity(identity.version, "package version", context),
  });
}

function adapterValidationContext<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  adapter: PackageAdapter<TProvider, TVersion, TRegistry>,
  operation: string,
): ValidationErrorContext<TProvider, TVersion> {
  const identity = adapter as PackageAdapter<TProvider, TVersion, TRegistry> & {
    readonly provider?: TProvider;
    readonly version?: TVersion;
  };
  return {
    operation,
    ...(identity.provider === undefined ? {} : { provider: identity.provider }),
    ...(identity.version === undefined ? {} : { version: identity.version }),
  };
}

function validatePageLimit(request: PageRequest, context: ValidationErrorContext): void {
  if (request.limit !== undefined) {
    requirePositiveInteger(request.limit, "page limit", context);
  }
}
