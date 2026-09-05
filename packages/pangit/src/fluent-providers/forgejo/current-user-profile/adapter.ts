import type {} from "../registration.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";

import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import { forgejoCurrentUserProfileSupport, getForgejoCurrentUserProfile } from "./operations.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
): Pick<Adapter<V>, "currentUserProfileSupport" | "getCurrentUserProfile"> {
  return {
    currentUserProfileSupport: forgejoCurrentUserProfileSupport,
    getCurrentUserProfile: (options) => getForgejoCurrentUserProfile(context, options),
  };
}
