import type { GitLabVersion } from "./native/GitLabNative.ts";
import { GitLabAdapterContext, type GitLabAdapterOptions } from "./GitLabAdapterContext.ts";
import type { Adapter } from "./shared.ts";
import {
  authorizeGitLabBasic,
  authorizeGitLabToken,
  beginGitLabOAuth,
  exchangeGitLabOAuthCode,
} from "./authentication.ts";
import { repositories } from "./repositories.ts";
import { branchesTags } from "./branches-tags.ts";
import { commits } from "./commits.ts";
import { content } from "./content.ts";
import { pullRequests } from "./pull-requests.ts";
import { issues } from "./issues.ts";
import { statusesProfile } from "./statuses-profile.ts";
import { webhooksRules } from "./webhooks-rules.ts";
import { releases } from "./releases.ts";
import { packages } from "./packages.ts";
import { ciReviews } from "./ci-reviews.ts";

/** One immutable, lazily selected exact-version GitLab adapter. */
export function createGitLabAdapter<V extends GitLabVersion>(
  version: V,
  options: GitLabAdapterOptions,
  c = new GitLabAdapterContext(version, options),
): Adapter<V> {
  return Object.freeze(
    {
      provider: "gitlab",
      version,
      native: Object.freeze({
        async gitlab<R>(
          use: (
            value: { client: import("./native/GitLabNative.ts").GitLabClient<V> },
          ) => R | Promise<R>,
        ) {
          return await use(Object.freeze({ client: await c.client() }));
        },
      }),
      authorizeToken: async (input, options) =>
        createGitLabAdapter(
          version,
          { baseUrl: c.webBaseUrl() },
          await authorizeGitLabToken(c, input, options),
        ),
      authorizeBasic: async (input, options) =>
        createGitLabAdapter(
          version,
          { baseUrl: c.webBaseUrl() },
          await authorizeGitLabBasic(c, input, options),
        ),
      beginOAuth: (input) => beginGitLabOAuth(c, input),
      exchangeOAuthCode: (input, options) => exchangeGitLabOAuthCode(c, input, options),
      ...repositories(c),
      ...branchesTags(c),
      ...commits(c),
      ...content(c),
      ...pullRequests(c),
      ...issues(c),
      ...statusesProfile(c),
      ...webhooksRules(c),
      ...releases(c),
      ...packages(c),
      ...ciReviews(c),
    } satisfies Adapter<V>,
  );
}
