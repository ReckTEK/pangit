import { normalizeSwagger2 } from "./normalize-openapi-document.ts";

export function normalizeAzureDevOps(version: string): Promise<void> {
  return normalizeSwagger2("azure-devops", version);
}
