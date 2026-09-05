import { guideMeta, GuidePage, MethodTable } from "../mod.ts";
import { CodeSnippet } from "../../components/code-snippet.tsx";
import { comments, issues } from "../methods/issues.ts";

export const meta = guideMeta("issues");

export default function Guide() {
  return (
    <GuidePage
      slug="issues"
      sections={[
        {
          id: "create",
          title: "Create an issue and add context",
          content: (
            <>
              <p>
                Issues are an optional repository capability. Read <code>support.supported</code>
                {" "}
                without a request before exposing the workflow in your application. Names such as
                labels and assignees must exist and be available to the authenticated user.
              </p>
              <CodeSnippet file="fluent/issues.ts" />
            </>
          ),
        },
        {
          id: "identity",
          title: "Use returned identities",
          content: (
            <>
              <p>
                An issue has an opaque <code>id</code> and a repository-local{" "}
                <code>number</code>, plus title, description, state, labels, assignees, and
                available dates or URLs. Keep the returned entity when editing or commenting; do not
                substitute a global ID for the local issue number.
              </p>
              <p>
                Comments return an ID, body, and available author, timestamp, and URL fields. Keep
                comment IDs opaque, especially on GitLab where the adapter retains the issue context
                needed to address them.
              </p>
            </>
          ),
        },
        {
          id: "methods",
          title: "Method reference",
          content: (
            <>
              <MethodTable {...issues} />
              <MethodTable {...comments} />
            </>
          ),
        },
      ]}
    />
  );
}
