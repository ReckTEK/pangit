import { GuideLink, guideMeta, GuidePage, MethodTable } from "../mod.ts";
import { CodeSnippet } from "../../components/code-snippet.tsx";
import { ci, statuses } from "../methods/statuses-ci.ts";

export const meta = guideMeta("statuses-ci");

export default function Guide() {
  return (
    <GuidePage
      slug="statuses-ci"
      sections={[
        {
          id: "publish",
          title: "Publish a commit status",
          content: (
            <>
              <p>
                A status names one check with <code>context</code>. Portable states are{" "}
                <code>pending</code>, <code>success</code>, and{" "}
                <code>failure</code>. Provider-specific states remain available through{" "}
                <GuideLink to="native-access">extensions</GuideLink>.
              </p>
              <CodeSnippet file="fluent/statuses.ts" />
              <p>
                References are explicit: <code>{`{ kind: "commit", sha }`}</code>,{" "}
                <code>{`{ kind: "branch", name }`}</code>,{" "}
                <code>{`{ kind: "tag", name }`}</code>, or{" "}
                <code>{`{ kind: "pullRequestHead", number }`}</code>. Use the exact commit SHA when
                publishing the result of a build, so a moving branch cannot attach the result to
                another commit.
              </p>
              <MethodTable {...statuses} />
            </>
          ),
        },
        {
          id: "discover",
          title: "Discover runs and jobs",
          content: (
            <>
              <p>
                CI discovery reads workflow, run, job, and artifact metadata. It does not start or
                cancel jobs, stream logs, or download artifacts. Check the capability metadata for
                supported filters and use native APIs for those additional operations.
              </p>
              <CodeSnippet file="fluent/ci.ts" />
              <p>
                Normalized status and conclusion fields make common states portable;{" "}
                <code>providerStatus</code> and <code>providerConclusion</code>{" "}
                preserve the host vocabulary where supplied. Unknown or absent values do not mean
                success. GitLab pipelines cannot be reliably filtered by historical workflow
                configuration path; that filter is unavailable.
              </p>
              <MethodTable {...ci} />
            </>
          ),
        },
      ]}
    />
  );
}
