import { normalizeSwagger2 } from "./openapi-document-normalization.ts";

export function normalizeCodeberg(version: string): Promise<void> {
  return normalizeSwagger2("codeberg", version);
}
