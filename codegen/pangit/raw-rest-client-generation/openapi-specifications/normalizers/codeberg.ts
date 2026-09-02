import { normalizeSwagger2 } from "./normalize-openapi-document.ts";

export function normalizeCodeberg(version: string): Promise<void> {
  return normalizeSwagger2("codeberg", version);
}
