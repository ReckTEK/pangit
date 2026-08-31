import { normalizeOpenApi3 } from "./openapi-document-normalization.ts";

export function normalizeGitHub(version: string): Promise<void> {
  return normalizeOpenApi3("github", version);
}
