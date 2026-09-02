import { normalizeOpenApi3 } from "./normalize-openapi-document.ts";

export function normalizeGitHub(version: string): Promise<void> {
  return normalizeOpenApi3("github", version);
}
