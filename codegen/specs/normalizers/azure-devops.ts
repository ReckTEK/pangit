import { normalizeSwagger2 } from "./utils.ts";

export function normalizeAzureDevOps(version: string): Promise<void> {
  return normalizeSwagger2("azure-devops", version);
}
