import { normalizeOpenApi3 } from "./utils.ts";

export function normalizeGitHub(version: string): Promise<void> {
  return normalizeOpenApi3("github", version);
}
