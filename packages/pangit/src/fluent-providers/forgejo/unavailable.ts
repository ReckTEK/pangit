import { CapabilityUnavailableError } from "../../fluent-api/adapter-contract/errors.ts";
import type { ForgejoVersion } from "./versions.ts";

export function unavailable(version: ForgejoVersion, operation: string, reason: string): never {
  throw new CapabilityUnavailableError(reason, { provider: "forgejo", version, operation });
}
