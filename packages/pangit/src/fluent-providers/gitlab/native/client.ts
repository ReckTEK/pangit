import type { GitLabClient, GitLabClientNative, GitLabVersion } from "./GitLabNative.ts";

/** Access the selected generated client without triggering a network request. */
export function createClientNative<V extends GitLabVersion>(
  client: () => Promise<GitLabClient<V>>,
): GitLabClientNative<V> {
  return Object.freeze({
    async gitlab<R>(use: (context: Readonly<{ client: GitLabClient<V> }>) => R | Promise<R>) {
      return await use(Object.freeze({ client: await client() }));
    },
  });
}
