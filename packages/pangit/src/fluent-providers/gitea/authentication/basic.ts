import type {
  BasicAuthorizationInput,
  BasicAuthorizationOptions,
} from "../../../fluent-api/adapter-contract/authentication.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import { requireSecret, validationError, verifyGiteaCredentials } from "./credentials.ts";

/** Attach RFC Basic credentials and an optional Gitea one-time-password header. */
export async function authorizeGiteaBasic<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  input: BasicAuthorizationInput,
  options: BasicAuthorizationOptions<"gitea"> = {},
): Promise<GiteaAdapterContext<TVersion>> {
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
    headers.set("X-GITEA-OTP", options.extension?.oneTimePassword);
  }
  return await verifyGiteaCredentials(
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
