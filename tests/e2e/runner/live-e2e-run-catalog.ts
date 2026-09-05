import { gitlabFluentContractIds } from "../hand-written/git-host-adapter-tests/gitlab/gitlab-contract-ids.ts";
import { giteaFluentContractIds } from "../hand-written/git-host-adapter-tests/gitea/gitea-contract-ids.ts";
import { liveTestPlan } from "../hand-written/read-live-test-plan.ts";
import type { E2ERunCatalog } from "./e2e-run-selection.ts";

const fluentContractIds = {
  gitea: giteaFluentContractIds,
  gitlab: gitlabFluentContractIds,
} as const satisfies Partial<Record<keyof typeof liveTestPlan.gitHosts, readonly string[]>>;

/** Stable host/version/contract catalog used to reject bad filters before Docker starts. */
export const liveE2ERunCatalog: E2ERunCatalog = Object.freeze(
  Object.fromEntries(
    Object.entries(liveTestPlan.gitHosts).map(([gitHost, entry]) => [
      gitHost,
      Object.freeze({
        versions: Object.freeze(Object.keys(entry.versions)),
        fluentContractIds: Object.freeze([
          ...(fluentContractIds[gitHost as keyof typeof fluentContractIds] ?? []),
        ]),
      }),
    ]),
  ),
);
