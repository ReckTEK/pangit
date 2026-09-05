import { guideMeta, GuidePage, MethodTable } from "../mod.ts";
import { CodeSnippet } from "../../components/code-snippet.tsx";
import { client, forks, owners, profile, repositories } from "../methods/repositories.ts";

export const meta = guideMeta("repositories");

export default function Guide() {
  return (
    <GuidePage
      slug="repositories"
      sections={[
        {
          id: "find-create",
          title: "Find or create a repository",
          content: (
            <>
              <p>
                An owner groups repositories. Use a user or organization name for Gitea and Forgejo;
                use the full namespace path, such as{" "}
                <code>acme/platform</code>, for a nested GitLab group.
              </p>
              <CodeSnippet file="fluent/repositories.ts" />
              <p>
                Nonempty <code>files</code> implies initialization. Each file has a relative{" "}
                <code>path</code> and string or byte{" "}
                <code>content</code>; initial files create new paths. <code>initialize: true</code>
                {" "}
                also creates a real initial branch when no files are supplied.
              </p>
              <p>
                The example is a convenience, not an atomic create-if-absent operation. Concurrent
                creation can still produce a <code>ConflictError</code>.
              </p>
            </>
          ),
        },
        {
          id: "snapshots",
          title: "Read identity, keep snapshots",
          content: (
            <>
              <p>
                A repository exposes <code>id</code>, <code>owner</code>, <code>name</code>,{" "}
                <code>fullName</code>, and optional <code>description</code>,{" "}
                <code>defaultBranch</code>, <code>private</code>, <code>url</code>, and{" "}
                <code>parent</code>. An absent value means the response did not establish it. Do not
                replace an unknown boolean with a claimed server state.
              </p>
              <p>
                Use the snapshot returned by <code>rename()</code>{" "}
                for later work. Branch, tag, issue, and pull-request handles likewise return
                snapshots rather than live records.
              </p>
              <MethodTable {...client} />
              <MethodTable {...owners} />
              <MethodTable {...repositories} />
            </>
          ),
        },
        {
          id: "forks",
          title: "Fork into a known owner",
          content: (
            <>
              <p>
                Fetch the destination with <code>git.container()</code> and pass that object as{" "}
                <code>destination</code>. Fork creation waits for that repository to become usable
                within{" "}
                <code>timeoutMs</code>; it does not search the entire destination account.
                Cancellation or a timeout can occur after the provider has created the fork.
              </p>
              <MethodTable {...forks} />
            </>
          ),
        },
        {
          id: "profile",
          title: "Read the current user",
          content: (
            <>
              <p>
                <code>await git.currentUserProfile.current()</code>{" "}
                returns an ID and username, with optional display name, email, avatar URL, and web
                URL. Visibility and token permissions affect which fields the host returns.
              </p>
              <MethodTable {...profile} />
            </>
          ),
        },
      ]}
    />
  );
}
