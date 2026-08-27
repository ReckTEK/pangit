import { normalizeSwagger2 } from "./utils.ts";

export function normalizeCodeberg(version: string): Promise<void> {
  return normalizeSwagger2("codeberg", version);
}
