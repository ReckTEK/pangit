import { normalizeSwagger2 } from "./normalize-openapi-document.ts";
import { normalizeForgejoActionsQuery } from "./forgejo-actions-query.ts";

export function normalizeCodeberg(version: string): Promise<void> {
  return normalizeSwagger2("codeberg", version, normalizeForgejoActionsQuery);
}
