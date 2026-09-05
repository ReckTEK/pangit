import { guideMeta, GuidePage, MethodTable, Note } from "../mod.ts";
import { CodeSnippet } from "../../components/code-snippet.tsx";
import { commits } from "../methods/commits.ts";

export const meta = guideMeta("commits");

export default function Guide() {
  return (
    <GuidePage
      slug="commits"
      sections={[
        {
          id: "inspect",
          title: "Ask for the detail you need",
          content: (
            <>
              <p>
                Commits expose a SHA, message, parents, and available actor metadata. Additional
                file lists, statistics, and signature verification are opt-in facets. Leaving them
                out avoids the extra work needed to obtain them.
              </p>
              <CodeSnippet file="fluent/commits.ts" />
            </>
          ),
        },
        {
          id: "bounds",
          title: "Make history limits explicit",
          content: (
            <>
              <p>
                History operations can examine many objects. Merge-base discovery requires both{" "}
                <code>maxItems</code> and{" "}
                <code>maxRequests</code>. A bound reached before the answer is proven raises{" "}
                <code>IncompleteHistoryError</code>; a partial answer is not labeled complete.
              </p>
              <p>
                Contributor counts describe the returned history slice, not the entire repository.
                Inspect <code>complete</code> and continue with{" "}
                <code>nextCursor</code>. Authors group by case-insensitive email, or exact name when
                email is absent; commits without an identity are omitted. Preserve those grouping
                rules if you aggregate multiple slices.
              </p>
              <Note title="Provider result limits">
                <p>
                  A comparison or commit file list is subject to the host’s diff limits. In
                  particular, GitLab may limit large diffs. An absent <code>totalCommits</code>{" "}
                  or optional statistic is unknown, not zero.
                </p>
              </Note>
            </>
          ),
        },
        {
          id: "methods",
          title: "Method reference",
          content: (
            <>
              <MethodTable {...commits} />
            </>
          ),
        },
      ]}
    />
  );
}
