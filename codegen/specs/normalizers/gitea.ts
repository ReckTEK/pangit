import { normalizeSwagger2, passThroughOpenApi3 } from "./utils.ts";

export function normalizeGitea(version: string): Promise<void> {
  if (version === "1.26.4") return normalizeSwagger2("gitea", version);
  return passThroughOpenApi3("gitea", version);
}
