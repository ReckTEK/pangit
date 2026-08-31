import { normalizeSwagger2 } from "./openapi-document-normalization.ts";

export function normalizeAzureDevOps(version: string): Promise<void> {
  return normalizeSwagger2("azure-devops", version);
}
