import type {
  PackageFile as PackageFile15,
  PackageType as Package15,
} from "../../../generated-rest-clients/forgejo/15.0.7/ForgejoRestClient.ts";
import type {
  PackageFile as PackageFile16,
  PackageType as Package16,
} from "../../../generated-rest-clients/forgejo/16.0.3/ForgejoRestClient.ts";
import type { ForgejoClient, ForgejoVersion } from "./ForgejoEntityNative.ts";

export type ForgejoPackageEntityKind = "package" | "packageFile";

type Forgejo15PackagePayloads = {
  package: Package15;
  packageFile: PackageFile15;
};

type Forgejo16PackagePayloads = {
  package: Package16;
  packageFile: PackageFile16;
};

/** Exact generated package payload selected by kind and Forgejo version. */
export type ForgejoPackageEntityPayload<
  TVersion extends ForgejoVersion,
  TKind extends ForgejoPackageEntityKind,
> = TVersion extends "15.0.7" ? Forgejo15PackagePayloads[TKind]
  : Forgejo16PackagePayloads[TKind];

export type ForgejoPackageEntityNativeContext<
  TVersion extends ForgejoVersion,
  TKind extends ForgejoPackageEntityKind,
> = Readonly<
  & { client: ForgejoClient<TVersion> }
  & { [TKey in TKind]: ForgejoPackageEntityPayload<TVersion, TKind> }
>;

/** Forgejo-only native door for package metadata or one package file. */
export interface ForgejoPackageEntityNative<
  TVersion extends ForgejoVersion,
  TKind extends ForgejoPackageEntityKind,
> {
  forgejo<TResult>(
    use: (
      context: ForgejoPackageEntityNativeContext<TVersion, TKind>,
    ) => TResult | Promise<TResult>,
  ): Promise<TResult>;
}

/** Retain exact package metadata without another provider request. */
export function createForgejoPackageEntityNative<
  TVersion extends ForgejoVersion,
  TKind extends ForgejoPackageEntityKind,
>(
  kind: TKind,
  client: ForgejoClient<TVersion>,
  payload: ForgejoPackageEntityPayload<TVersion, TKind>,
): ForgejoPackageEntityNative<TVersion, TKind> {
  const context = Object.freeze({ client, [kind]: payload }) as ForgejoPackageEntityNativeContext<
    TVersion,
    TKind
  >;
  return Object.freeze({
    async forgejo<TResult>(
      use: (
        value: ForgejoPackageEntityNativeContext<TVersion, TKind>,
      ) => TResult | Promise<TResult>,
    ): Promise<TResult> {
      return await use(context);
    },
  });
}
