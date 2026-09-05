import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";

import { extra, id, object, required, text } from "../transport/mod.ts";
import type { Adapter } from "../adapter.ts";
import { door } from "../native/door.ts";

export function currentUserProfile<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
): Pick<Adapter<V>, "currentUserProfileSupport" | "getCurrentUserProfile"> {
  const ops: Pick<Adapter<V>, "currentUserProfileSupport" | "getCurrentUserProfile"> = {
    currentUserProfileSupport: Object.freeze({ supported: true, current: "direct" }),
    getCurrentUserProfile: async (o) => {
      const p = object(
        c,
        "getCurrentUserProfile",
        (await extra(c, "getCurrentUserProfile", "GET", "/user", {}, o)).body,
      );
      return Object.freeze({
        id: id(c, "getCurrentUserProfile", p.id),
        username: required(c, "getCurrentUserProfile", p.username),
        displayName: text(p.name),
        email: text(p.email),
        avatarUrl: text(p.avatar_url),
        webUrl: text(p.web_url),
        native: await door(c, "currentUserProfile", p),
      });
    },
  };
  return ops;
}
