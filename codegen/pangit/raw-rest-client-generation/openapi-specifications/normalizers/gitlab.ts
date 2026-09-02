import { normalizeSwagger2 } from "./normalize-openapi-document.ts";

export function normalizeGitLab(version: string): Promise<void> {
  return normalizeSwagger2("gitlab", version);
}
