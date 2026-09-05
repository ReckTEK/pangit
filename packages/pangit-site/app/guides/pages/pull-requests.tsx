import { GuideLink, guideMeta, GuidePage, MethodTable, Note } from "../mod.ts";
import { CodeSnippet } from "../../components/code-snippet.tsx";
import { pullRequests, reviews } from "../methods/pull-requests.ts";

export const meta = guideMeta("pull-requests");

export default function Guide() {
  return (
    <GuidePage
      slug="pull-requests"
      sections={[
        {
          id: "open",
          title: "Open a change for review",
          content: (
            <>
              <p>
                Commit your changes to a source branch first. This example continues the{" "}
                <GuideLink to="files">file-writing workflow</GuideLink>. GitLab merge requests use
                the same <code>pullRequests</code> contract.
              </p>
              <CodeSnippet file="fluent/pull-request.ts" />
              <p>
                A cross-repository change uses the fork owner and name in{" "}
                <code>source</code>. The target is the repository whose <code>pullRequests</code>
                {" "}
                handle you are calling.
              </p>
            </>
          ),
        },
        {
          id: "merge",
          title: "Merge when the change is ready",
          content: (
            <>
              <p>
                The provider applies its permissions, approvals, checks, and merge policies. This
                call performs the merge; creating the builder alone does not.
              </p>
              <CodeSnippet file="fluent/merge.ts" />
              <p>
                <code>state</code> is open or closed; inspect <code>merged</code>{" "}
                to distinguish a merge from an ordinary close.{" "}
                <code>mergeable</code>, merge-base SHA, and merge-commit SHA are optional because a
                host may not have established them.
              </p>
            </>
          ),
        },
        {
          id: "review",
          title: "Comments and persistent reviews",
          content: (
            <>
              <p>
                Use <code>comment()</code> for a general comment or a portable inline position; use
                {" "}
                <code>approve()</code>{" "}
                for a direct approval. Persistent draft reviews are a separate optional capability:
                obtain <code>reviews = repo.pullRequests.reviews(pullRequest)</code>, check{" "}
                <code>reviews.support.supported</code>, create a pending review, then submit it.
              </p>
              <Note title="GitLab review lifecycle">
                <p>
                  GitLab supports the core reviewer, comment, and approval operations. It does not
                  implement the persistent pending/submitted review-object lifecycle. Dismissal,
                  replies, resolution, and richer positions belong to provider extensions or native
                  APIs.
                </p>
              </Note>
              <MethodTable {...reviews} />
            </>
          ),
        },
        {
          id: "methods",
          title: "Pull-request method reference",
          content: (
            <>
              <MethodTable {...pullRequests} />
            </>
          ),
        },
      ]}
    />
  );
}
