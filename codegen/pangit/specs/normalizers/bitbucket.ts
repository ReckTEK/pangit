import { normalizeOpenApi3 } from "./openapi-document-normalization.ts";

export function normalizeBitbucket(version: string): Promise<void> {
  return normalizeOpenApi3("bitbucket", version);
}
