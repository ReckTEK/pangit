import type {
  CurrentUserProfileCapabilitySupport,
  CurrentUserProfileData,
} from "../../../fluent-api/adapter-contract/optional/current-user-profile.ts";
import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";
import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoClient, ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import {
  createForgejoCurrentUserProfileNative,
  type ForgejoCurrentUserProfilePayload,
} from "../native/ForgejoCurrentUserProfileNative.ts";
import { requestForgejoBody } from "../transport/response/mod.ts";

type AnyForgejoUser = ForgejoCurrentUserProfilePayload<ForgejoVersion>;

export const forgejoCurrentUserProfileSupport: CurrentUserProfileCapabilitySupport = Object.freeze({
  supported: true,
  current: "direct",
});

/** Fetch and normalize the authenticated identity with one direct provider request. */
export async function getForgejoCurrentUserProfile<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  options: OperationOptions = {},
): Promise<CurrentUserProfileData<"forgejo", TVersion>> {
  const operation = { universal: "getCurrentUserProfile", native: "userGetCurrent" } as const;
  const client = await context.client();
  const payload = await requestForgejoBody<AnyForgejoUser, TVersion>(
    context,
    operation,
    () => client.userGetCurrent({}, requestOptions(options.signal)),
    options.signal,
    isUserPayload,
  );
  return normalizeForgejoCurrentUserProfile(client, payload);
}

export function normalizeForgejoCurrentUserProfile<TVersion extends ForgejoVersion>(
  client: ForgejoClient<TVersion>,
  payload: AnyForgejoUser,
): CurrentUserProfileData<"forgejo", TVersion> {
  const username = requiredText(payload.login, "current-user login");
  return Object.freeze({
    id: requiredText(payload.id, `current user ${username} id`),
    username,
    ...(optionalText(payload.full_name) === undefined
      ? {}
      : { displayName: optionalText(payload.full_name) }),
    ...(optionalText(payload.email) === undefined ? {} : { email: optionalText(payload.email) }),
    ...(optionalText(payload.avatar_url) === undefined
      ? {}
      : { avatarUrl: optionalText(payload.avatar_url) }),
    ...(optionalText(payload.html_url) === undefined
      ? {}
      : { webUrl: optionalText(payload.html_url) }),
    native: createForgejoCurrentUserProfileNative(
      client,
      payload as ForgejoCurrentUserProfilePayload<TVersion>,
    ),
  });
}

function requestOptions(signal?: AbortSignal): { readonly signal: AbortSignal } | undefined {
  return signal === undefined ? undefined : { signal };
}

function isUserPayload(value: unknown): value is AnyForgejoUser {
  return isRecord(value) && hasText(value.login) && hasText(value.id);
}

function requiredText(value: unknown, name: string): string {
  const text = optionalText(value);
  if (text === undefined || text.trim().length === 0) throw new TypeError(`${name} is missing`);
  return text;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string"
    ? value
    : typeof value === "number" || typeof value === "bigint"
    ? String(value)
    : undefined;
}

function hasText(value: unknown): boolean {
  const text = optionalText(value);
  return text !== undefined && text.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
