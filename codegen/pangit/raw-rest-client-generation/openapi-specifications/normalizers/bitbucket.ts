import { normalizeOpenApi3 } from "./normalize-openapi-document.ts";

export function normalizeBitbucket(version: string): Promise<void> {
  return normalizeOpenApi3("bitbucket", version);
}
