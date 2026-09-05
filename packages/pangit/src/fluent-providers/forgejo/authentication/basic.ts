import type {
  BasicAuthorizationInput,
  BasicAuthorizationOptions,
} from "../../../fluent-api/adapter-contract/authentication.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import { requireSecret, validationError, verifyForgejoCredentials } from "./credentials.ts";

/** Attach RFC Basic credentials and an optional Forgejo one-time-password header. */
export async function authorizeForgejoBasic<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  input: BasicAuthorizationInput,
  options: BasicAuthorizationOptions<"forgejo"> = {},
): Promise<ForgejoAdapterContext<TVersion>> {
  const operation = { universal: "authorizeBasic", native: "userGetCurrent" } as const;
  if (input.username.trim().length === 0) {
    throw validationError(context, operation, "username cannot be blank");
  }
  if (input.username.includes(":")) {
    throw validationError(context, operation, "username cannot contain ':'");
  }
  requireSecret(context, operation, input.password, "password");
  if (
    options.extension?.oneTimePassword !== undefined &&
    options.extension?.oneTimePassword.trim().length === 0
  ) {
    throw validationError(context, operation, "oneTimePassword cannot be blank");
  }
  const headers = new Headers({
    Authorization: `Basic ${utf8Base64(`${input.username}:${input.password}`)}`,
  });
  if (options.extension?.oneTimePassword !== undefined) {
    headers.set("X-FORGEJO-OTP", options.extension?.oneTimePassword);
  }
  return await verifyForgejoCredentials(
    context.withHeaders(headers),
    operation,
    options,
  );
}

function utf8Base64(value: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(value)) binary += String.fromCharCode(byte);
  return btoa(binary);
}
