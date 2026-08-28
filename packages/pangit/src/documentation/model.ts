/** Documentation for the exact provider contracts shipped by this package. */
export interface DocumentationManifest {
  schemaVersion: 1;
  package: { name: string; version: string };
  providers: DocumentationProvider[];
  guides: DocumentationGuide[];
}

/** One provider and all of its generated API versions. */
export interface DocumentationProvider {
  id: string;
  name: string;
  kind: "release" | "live";
  upstream: string;
  selected: string;
  client: { className: string; displayName: string; namespaceName: string; variablePrefix: string };
  versions: DocumentationVersion[];
}

/** Routes, provenance, and counts for one complete OpenAPI reference. */
export interface DocumentationVersion {
  version: string;
  route: string;
  specUrl: string;
  source: string;
  sourceSha256: string;
  sha256: string;
  openapi: string;
  operationCount: number;
  schemaCount: number;
  tags: { name: string; count: number }[];
  servers: { url: string; description?: string }[];
  /** Query-selected operations that OpenAPI cannot express beside the same path and method. */
  variants: { id: string; method: string; path: string; label: string }[];
  artifacts: { openapi: string; operations: string };
}

/** A raw client method and its corresponding HTTP operation. */
export interface DocumentationOperation {
  source: { collection: "paths" | "x-ms-paths"; path: string };
  methodName: string;
  operationId: string;
  method: string;
  path: string;
  summary?: string;
  deprecated?: boolean;
  tags: readonly string[];
  variant?: string;
}

/** A handwritten tutorial; its source stays outside the generator. */
export interface DocumentationGuide {
  slug: string;
  title: string;
  source: string;
  route: string;
  provider?: string;
  version?: string;
}

/** Original Markdown content, including tutorial and source-file links. */
export interface DocumentationGuideContent extends DocumentationGuide {
  markdown: string;
}
