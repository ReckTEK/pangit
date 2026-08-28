/**
 * Generated documentation catalog. Import this separate entry point to build
 * documentation tools without adding documentation assets to REST consumers.
 * @module
 */
import manifest from "./documentation/generated/manifest.json" with { type: "json" };
import { guideLoaders, operationLoaders } from "./documentation/generated/loaders.ts";
import type {
  DocumentationGuideContent,
  DocumentationManifest,
  DocumentationOperation,
} from "./documentation/model.ts";

export type * from "./documentation/model.ts";

/** All generated providers, versions, artifact paths, and handwritten guides. */
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

/** Load a handwritten guide by its catalog slug. Unknown guides return undefined. */
export async function loadDocumentationGuide(
  slug: string,
): Promise<DocumentationGuideContent | undefined> {
  if (!Object.hasOwn(guideLoaders, slug)) return undefined;
  return (await guideLoaders[slug as keyof typeof guideLoaders]()).default;
}
