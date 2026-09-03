import type { ProviderSourceProvenance } from "./rest-client-render-context.ts";

/** Render auditable schema-license provenance into each generated provider module. */
export function renderProvenanceComment(provenance?: ProviderSourceProvenance): string {
  if (provenance === undefined) return "";
  const line = (value: string): string => value.replaceAll(/\s+/g, " ").trim();
  if (provenance.licenseSpdx === null) {
    return [
      `// OpenAPI source: ${line(provenance.specificationSource)}`,
      `// OpenAPI SHA-256: ${line(provenance.specificationSha256)}`,
      "// Schema license: no separate license evidence recorded",
      "// Third-party source notice: THIRD_PARTY_NOTICES.md",
      "",
    ].join("\n");
  }
  const declaration = provenance.licenseDeclaration === null ? [] : [
    `// Schema license declaration: ${line(provenance.licenseDeclaration.name)} (${
      line(provenance.licenseDeclaration.url)
    })`,
  ];
  return [
    `// OpenAPI source: ${line(provenance.specificationSource)}`,
    `// OpenAPI SHA-256: ${line(provenance.specificationSha256)}`,
    `// Schema license: ${provenance.licenseSpdx} (${line(provenance.licenseSource!)})`,
    `// Downloaded license SHA-256: ${line(provenance.licenseSha256!)}`,
    ...declaration,
    `// Attribution: ${line(provenance.attribution!)}`,
    "// Full license text and notices: THIRD_PARTY_NOTICES.md",
    "",
  ].join("\n");
}
