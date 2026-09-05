import { GuideLink, guideMeta, GuidePage, MethodTable, Note } from "../mod.ts";
import { CodeSnippet } from "../../components/code-snippet.tsx";
import { rules, webhooks } from "../methods/webhooks-rules.ts";

export const meta = guideMeta("webhooks-rules");

export default function Guide() {
  return (
    <GuidePage
      slug="webhooks-rules"
      sections={[
        {
          id: "configure",
          title: "Configure events and inspect protection",
          content: (
            <>
              <CodeSnippet file="fluent/webhooks.ts" />
              <p>
                Portable events are <code>push</code>, <code>pull-request</code>,{" "}
                <code>issue</code>, and <code>release</code>. Returned <code>providerEvents</code>
                {" "}
                preserve native event names. Deliveries, test delivery, provider configuration, and
                secret rotation belong to native APIs.
              </p>
              <p>
                GitLab hooks support JSON and do not have the portable active switch. Unsupported
                input is rejected; PanGit does not silently discard it.
              </p>
              <MethodTable {...webhooks} />
            </>
          ),
        },
        {
          id: "rules",
          title: "Configured rules and effective enforcement",
          content: (
            <>
              <p>
                Configured rules are policy records. Effective protection describes what the host
                actually enforces for a specific branch. Read their separate support flags; one does
                not imply the other.
              </p>
              <p>
                Portable policy fields include <code>pushAllowed</code>,{" "}
                <code>forcePushAllowed</code>, <code>signedCommitsRequired</code>,{" "}
                <code>statusChecksRequired</code>, <code>statusCheckContexts</code>,{" "}
                <code>requiredApprovals</code>, <code>blockOnRejectedReviews</code>,{" "}
                <code>blockOnOutdatedBranch</code>, and{" "}
                <code>dismissStaleApprovals</code>. Provider support differs: GitLab currently
                exposes push and force-push policy only.
              </p>
              <Note title="GitLab protection-cache bug">
                <p>
                  Configured-rule CRUD works, but the supported GitLab versions can enforce stale
                  cached protection after a rule changes. Effective protection therefore throws{" "}
                  <code>CapabilityUnavailableError</code>. The diagnostics and upstream patch
                  follow-up are linked in <GuideLink to="providers">provider support</GuideLink>.
                </p>
              </Note>
              <MethodTable {...rules} />
            </>
          ),
        },
      ]}
    />
  );
}
