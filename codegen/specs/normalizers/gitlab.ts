import { normalizeSwagger2 } from "./utils.ts";

export function normalizeGitLab(version: string): Promise<void> {
  return normalizeSwagger2("gitlab", version);
}
