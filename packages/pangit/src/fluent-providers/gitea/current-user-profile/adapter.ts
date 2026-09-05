import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";

import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import { getGiteaCurrentUserProfile, giteaCurrentUserProfileSupport } from "./operations.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends GiteaVersion>(
  context: GiteaAdapterContext<V>,
): Pick<Adapter<V>, "currentUserProfileSupport" | "getCurrentUserProfile"> {
  return {
    currentUserProfileSupport: giteaCurrentUserProfileSupport,
    getCurrentUserProfile: (options) => getGiteaCurrentUserProfile(context, options),
  };
}
