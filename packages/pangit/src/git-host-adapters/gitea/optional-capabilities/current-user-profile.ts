import type {
  CurrentUserProfileCapabilitySupport,
  CurrentUserProfileData,
} from "../../../fluent-api/adapter-contract/optional/current-user-profile.ts";
import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";
import { fluentClientCapabilitySupport } from "../../../fluent-api/provider-registry.ts";
import type { GiteaAdapterContext } from "../GiteaAdapterContext.ts";
import type { GiteaClient, GiteaVersion } from "../native/GiteaEntityNative.ts";
import {
  createGiteaCurrentUserProfileNative,
  type GiteaCurrentUserProfilePayload,
} from "../native/GiteaCurrentUserProfileNative.ts";
import { requestGiteaBody } from "../response.ts";

type AnyGiteaUser = GiteaCurrentUserProfilePayload<GiteaVersion>;

export const giteaCurrentUserProfileSupport: CurrentUserProfileCapabilitySupport =
  fluentClientCapabilitySupport.gitea["1.27.2"].currentUserProfile;

/** Fetch and normalize the authenticated identity with one direct provider request. */
export async function getGiteaCurrentUserProfile<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  options: OperationOptions = {},
): Promise<CurrentUserProfileData<"gitea", TVersion>> {
  const operation = { universal: "getCurrentUserProfile", native: "userGetCurrent" } as const;
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaUser, TVersion>(
    context,
    operation,
    () => client.userGetCurrent({}, requestOptions(options.signal)),
    options.signal,
    isUserPayload,
  );
  return normalizeGiteaCurrentUserProfile(client, payload);
}

export function normalizeGiteaCurrentUserProfile<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  payload: AnyGiteaUser,
): CurrentUserProfileData<"gitea", TVersion> {
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
    native: createGiteaCurrentUserProfileNative(
      client,
      payload as GiteaCurrentUserProfilePayload<TVersion>,
    ),
  });
}

function requestOptions(signal?: AbortSignal): { readonly signal: AbortSignal } | undefined {
  return signal === undefined ? undefined : { signal };
}

function isUserPayload(value: unknown): value is AnyGiteaUser {
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
