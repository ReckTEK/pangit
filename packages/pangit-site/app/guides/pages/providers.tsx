import { FluentProviderTable } from "../fluent-provider-table.tsx";
import { guideMeta, GuidePage, Note, SourceLink } from "../mod.ts";
import { CodeSnippet } from "../../components/code-snippet.tsx";

export const meta = guideMeta("providers");

export default function Guide() {
  return (
    <GuidePage
      slug="providers"
      sections={[
        {
          id: "versions",
          title: "Choose the contract explicitly",
          content: (
            <>
              <p>
                The version argument selects an API contract, not the PanGit package version. PanGit
                does not inspect the server and negotiate a version. Both a host root and the
                provider API root are accepted by fluent factories: <code>/api/v1</code>{" "}
                for Gitea/Forgejo and <code>/api/v4</code> for GitLab.
              </p>
              <FluentProviderTable />
              <CodeSnippet file="fluent/providers.ts" />
              <p>
                GitHub, Bitbucket, Azure DevOps, and the Codeberg schema snapshot have generated
                REST clients. They do not select additional fluent implementations.
              </p>
            </>
          ),
        },
        {
          id: "codeberg",
          title: "Codeberg uses the Forgejo implementation",
          content: (
            <>
              <p>
                <code>createCodebergClient(version)</code>{" "}
                fixes the API and browser URLs to Codeberg and selects Forgejo. Native callbacks and
                extensions are still named <code>forgejo</code>. Check Codeberg’s{" "}
                <code>/api/v1/version</code>{" "}
                when selecting a contract; its deployment may be ahead of a stable Forgejo release.
              </p>
              <p>
                Local E2E evidence covers the pinned stock Forgejo releases. It does not claim
                testing against Codeberg user accounts or hosted administrator operations. Hosting
                policies, quotas, permissions, and instance configuration still apply.
              </p>
            </>
          ),
        },
        {
          id: "metadata",
          title: "Read support before offering a feature",
          content: (
            <>
              <p>
                Optional handles expose static, request-free <code>support</code>{" "}
                metadata. Most have <code>supported</code>{" "}
                and per-operation modes such as direct, one-page, bounded, or unsupported. Branch
                rules split <code>configuredRules.supported</code> and{" "}
                <code>effectiveProtection.supported</code>. Inspect the specific operation as well
                as the capability.
              </p>
              <p>
                <code>git.unsupportedOptionalCapabilities.support</code>{" "}
                records the explicitly unavailable deployments/environments and gists/snippets
                families. Support describes the adapter contract; it does not grant server
                permission. Instance settings may still reject an otherwise implemented operation.
              </p>
            </>
          ),
        },
        {
          id: "gitea-forgejo",
          title: "Gitea and Forgejo differences",
          content: (
            <>
              <ul>
                <li>
                  Gitea 1.27.2 adds raw diff/patch comparison. Both supported Gitea versions expose
                  branch-rule priority and issue content-version extensions. Forgejo exposes none of
                  these three extensions.
                </li>
                <li>
                  Forgejo 15 supports workflow files and runs; jobs and artifacts require Forgejo
                  16. Their operation support values are unsupported on Forgejo 15.
                </li>
                <li>
                  Forgejo has no ordered branch-rule priority or writable force-push permission. It
                  does support configured rules and effective protection.
                </li>
                <li>
                  Forgejo file commits are atomic mutations capped at 50 changes. Read batches use
                  bounded concurrency. Whole-package deletion snapshots matching versions within ten
                  pages of 100 entries before deleting.
                </li>
              </ul>
              <p>
                See the{" "}
                <SourceLink path="packages/pangit/docs/Forgejo.md">
                  Forgejo provider notes
                </SourceLink>{" "}
                for version details and the annotated-tag status diagnostic.
              </p>
            </>
          ),
        },
        {
          id: "gitlab",
          title: "GitLab differences and known bugs",
          content: (
            <>
              <ul>
                <li>
                  Use token or OAuth authentication. Password-based Basic authentication and atomic
                  branch rename are unavailable.
                </li>
                <li>
                  Core comments, reviewer requests, and approvals work. Persistent draft/submitted
                  review objects do not.
                </li>
                <li>
                  Releases have no portable draft or prerelease state. Asset deletion removes the
                  release link while retaining the project upload.
                </li>
                <li>
                  Webhooks use JSON and have no portable active switch. Branch-rule fields currently
                  cover push and force-push permissions.
                </li>
                <li>
                  CI discovery uses pipelines and jobs. Historical workflow-path filtering is
                  unavailable; artifact IDs identify jobs.
                </li>
              </ul>
              <Note title="Confirmed upstream bugs on both supported GitLab versions">
                <p>
                  <strong>Protection cache:</strong>{" "}
                  GitLab can keep enforcing an old rule after its configuration changes. PanGit
                  omits branch protected flags and rejects effective-protection reads. Configured
                  rules remain available.
                </p>
                <p>
                  <strong>Branch-name cache:</strong>{" "}
                  GitLab can accept branch creation and immediately reject a commit to that same
                  branch. PanGit surfaces the failure without retrying the write.
                </p>
              </Note>
              <p>
                The focused{" "}
                <SourceLink path="tests/e2e/hand-written/diagnostics/gitlab/protection-cache/README.md">
                  protection-cache
                </SourceLink>{" "}
                and{" "}
                <SourceLink path="tests/e2e/hand-written/diagnostics/gitlab/branch-names-cache/README.md">
                  branch-name-cache
                </SourceLink>{" "}
                diagnostics contain reproductions and upstream fork/patch follow-up. See the{" "}
                <SourceLink path="packages/pangit/docs/GitLab.md">
                  GitLab provider notes
                </SourceLink>{" "}
                for the full boundaries.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
