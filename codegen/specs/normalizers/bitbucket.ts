import { normalizeOpenApi3 } from "./utils.ts";

export function normalizeBitbucket(version: string): Promise<void> {
  return normalizeOpenApi3("bitbucket", version);
}
