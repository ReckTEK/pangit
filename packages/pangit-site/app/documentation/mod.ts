/** Site-owned generated documentation catalog. @module */
import manifest from "./generated/manifest.json" with { type: "json" };
import { operationLoaders } from "./generated/loaders.ts";
import type { DocumentationManifest, DocumentationOperation } from "./model.ts";

export type * from "./model.ts";

/** All generated providers, versions, and artifact paths. */
export const documentation: DocumentationManifest = manifest as DocumentationManifest;

/** Load only the requested client's method index. Unknown clients return undefined. */
export async function loadDocumentationOperations(
  provider: string,
  version: string,
): Promise<DocumentationOperation[] | undefined> {
  const key = `${provider}/${version}`;
  if (!Object.hasOwn(operationLoaders, key)) return undefined;
  return (await operationLoaders[key as keyof typeof operationLoaders]())
    .default as DocumentationOperation[];
}
