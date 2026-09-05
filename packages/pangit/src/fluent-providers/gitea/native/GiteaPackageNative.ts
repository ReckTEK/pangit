import type {
  PackageFile as PackageFile126,
  PackageType as Package126,
} from "../../../generated-rest-clients/gitea/1.26.4/GiteaRestClient.ts";
import type {
  PackageFile as PackageFile127,
  PackageType as Package127,
} from "../../../generated-rest-clients/gitea/1.27.2/GiteaRestClient.ts";
import type { GiteaClient, GiteaVersion } from "./GiteaEntityNative.ts";

export type GiteaPackageEntityKind = "package" | "packageFile";

type Gitea126PackagePayloads = {
  package: Package126;
  packageFile: PackageFile126;
};

type Gitea127PackagePayloads = {
  package: Package127;
  packageFile: PackageFile127;
};

/** Exact generated package payload selected by kind and Gitea version. */
export type GiteaPackageEntityPayload<
  TVersion extends GiteaVersion,
  TKind extends GiteaPackageEntityKind,
> = TVersion extends "1.26.4" ? Gitea126PackagePayloads[TKind]
  : Gitea127PackagePayloads[TKind];

export type GiteaPackageEntityNativeContext<
  TVersion extends GiteaVersion,
  TKind extends GiteaPackageEntityKind,
> = Readonly<
  & { client: GiteaClient<TVersion> }
  & { [TKey in TKind]: GiteaPackageEntityPayload<TVersion, TKind> }
>;

/** Gitea-only native door for package metadata or one package file. */
export interface GiteaPackageEntityNative<
  TVersion extends GiteaVersion,
  TKind extends GiteaPackageEntityKind,
> {
  gitea<TResult>(
    use: (
      context: GiteaPackageEntityNativeContext<TVersion, TKind>,
    ) => TResult | Promise<TResult>,
  ): Promise<TResult>;
}

/** Retain exact package metadata without another provider request. */
export function createGiteaPackageEntityNative<
  TVersion extends GiteaVersion,
  TKind extends GiteaPackageEntityKind,
>(
  kind: TKind,
  client: GiteaClient<TVersion>,
  payload: GiteaPackageEntityPayload<TVersion, TKind>,
): GiteaPackageEntityNative<TVersion, TKind> {
  const context = Object.freeze({ client, [kind]: payload }) as GiteaPackageEntityNativeContext<
    TVersion,
    TKind
  >;
  return Object.freeze({
    async gitea<TResult>(
      use: (
        value: GiteaPackageEntityNativeContext<TVersion, TKind>,
      ) => TResult | Promise<TResult>,
    ): Promise<TResult> {
      return await use(context);
    },
  });
}
