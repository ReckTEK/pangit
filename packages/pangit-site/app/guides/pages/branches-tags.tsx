import { GuideLink, guideMeta, GuidePage, MethodTable, Note } from "../mod.ts";
import { CodeSnippet } from "../../components/code-snippet.tsx";
import { branches, tags } from "../methods/branches-tags.ts";

export const meta = guideMeta("branches-tags");

export default function Guide() {
  return (
    <GuidePage
      slug="branches-tags"
      sections={[
        {
          id: "create",
          title: "Create a branch and a tag",
          content: (
            <>
              <p>
                Branches move as commits arrive. Tags name a point in history. Use a commit SHA when
                a workflow must act on an exact revision.
              </p>
              <CodeSnippet file="fluent/branches.ts" />
            </>
          ),
        },
        {
          id: "divergence",
          title: "Compare branch positions",
          content: (
            <>
              <p>
                <code>divergence(base, head)</code>{" "}
                reports commits ahead of and behind the base. Successful results are complete;
                PanGit does not present a truncated count as exact. <code>listDivergences()</code>
                {" "}
                adds those counts to each branch in one bounded page.
              </p>
              <Note title="GitLab differences">
                <p>
                  GitLab has no atomic branch rename in this contract. The supported GitLab versions
                  also have an upstream protection-cache bug: <code>protected</code>{" "}
                  is omitted and effective branch protection is unavailable. See{" "}
                  <GuideLink to="providers">provider support</GuideLink>.
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
              <MethodTable {...branches} />
              <MethodTable {...tags} />
            </>
          ),
        },
      ]}
    />
  );
}
