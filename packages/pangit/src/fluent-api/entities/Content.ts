import type { ProviderVersion } from "../../generated-rest-clients/git-host.ts";
import type { ContentData, RepositoryContentKind } from "../adapter-contract/content.ts";
import type { ReadableContentBody } from "../adapter-contract/content-body.ts";
import { createContentBody } from "../content-body.ts";
import type { ProviderEntityNative } from "../native-access/ProviderNativeRegistry.ts";
import type { FluentProvider } from "../provider-registry.ts";

export interface Content<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> extends ReadableContentBody {
  readonly kind: RepositoryContentKind;
  readonly path: string;
  readonly name: string;
  readonly sha?: string;
  readonly size?: number;
  readonly bytes?: Readonly<Uint8Array>;
  readonly target?: string;
  readonly submoduleUrl?: string;
  readonly dereferenced?: Content<TProvider, TVersion>;
  readonly lastCommitSha?: string;
  readonly firstParentSha?: string;
  readonly native: ProviderEntityNative<TProvider, TVersion, "content">;
}

export function createContent<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(data: ContentData<TProvider, TVersion>): Content<TProvider, TVersion> {
  const bytes = data.bytes === undefined ? undefined : data.bytes.slice();
  const content: Content<TProvider, TVersion> = {
    ...createContentBody({
      kind: data.kind,
      bytes,
      path: data.path,
      ...(data.mediaType === undefined ? {} : { mediaType: { ...data.mediaType } }),
    }, "content"),
    kind: data.kind,
    path: data.path,
    name: data.name,
    ...(data.sha === undefined ? {} : { sha: data.sha }),
    ...(data.size === undefined ? {} : { size: data.size }),
    ...(data.target === undefined ? {} : { target: data.target }),
    ...(data.submoduleUrl === undefined ? {} : { submoduleUrl: data.submoduleUrl }),
    ...(data.dereferenced === undefined ? {} : { dereferenced: createContent(data.dereferenced) }),
    ...(data.lastCommitSha === undefined ? {} : { lastCommitSha: data.lastCommitSha }),
    ...(data.firstParentSha === undefined ? {} : { firstParentSha: data.firstParentSha }),
    native: data.native,
  };
  if (bytes !== undefined) {
    Object.defineProperty(content, "bytes", {
      enumerable: true,
      get: () => bytes.slice(),
    });
  }
  return Object.freeze(content);
}
