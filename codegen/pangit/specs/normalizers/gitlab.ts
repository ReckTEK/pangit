import { normalizeSwagger2 } from "./openapi-document-normalization.ts";

export function normalizeGitLab(version: string): Promise<void> {
  return normalizeSwagger2("gitlab", version);
}
