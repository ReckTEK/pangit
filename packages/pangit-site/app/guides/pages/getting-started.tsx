import { GuideLink, guideMeta, GuidePage, Note } from "../mod.ts";
import { CodeSnippet } from "../../components/code-snippet.tsx";

export const meta = guideMeta("getting-started");

export default function Guide() {
  return (
    <GuidePage
      slug="getting-started"
      sections={[
        {
          id: "setup",
          title: "1. Install PanGit",
          content: (
            <>
              <p>
                PanGit gives Gitea, Forgejo, and GitLab the same TypeScript API. Select your
                provider and version, authenticate, then work with repositories, files, and pull
                requests through one contract.
              </p>
              <Note title="Alpha · select an explicit version">
                <p>
                  Public APIs may change between alpha releases. You need Deno 2 and an existing Git
                  host. Run this command in your own project:
                </p>
              </Note>
              <CodeSnippet file="install.sh" />
              <p>
                Create <code>quickstart.ts</code> alongside your{" "}
                <code>deno.json</code>. Imports from <code>@recktek/pangit/api</code>{" "}
                resolve to the installed package.
              </p>
            </>
          ),
        },
        {
          id: "first-request",
          title: "2. Read a file",
          content: (
            <>
              <p>
                Replace the host, owner, repository, and branch below with your own. Use an API
                version compatible with your server; see{" "}
                <GuideLink to="providers">provider support</GuideLink>.
              </p>
              <CodeSnippet file="fluent/quickstart.ts" />
              <p>
                Set <code>GIT_TOKEN</code> in your shell, then run{" "}
                <code>
                  deno run --allow-env=GIT_TOKEN --allow-net=git.example.com quickstart.ts
                </code>. A private repository needs a token with permission to read it.
              </p>
            </>
          ),
        },
        {
          id: "shape",
          title: "3. Follow the objects",
          content: (
            <>
              <ol>
                <li>
                  <code>createClient()</code>{" "}
                  selects a provider and version. Construction makes no HTTP request.
                </li>
                <li>
                  <code>auth.token()</code>{" "}
                  verifies credentials and returns a new authenticated client.
                </li>
                <li>
                  <code>container()</code>{" "}
                  fetches an owner: a user, organization, or GitLab namespace.
                </li>
                <li>
                  <code>repository()</code> fetches a repository snapshot with handles such as{" "}
                  <code>content</code>, <code>branches</code>, and <code>pullRequests</code>.
                </li>
              </ol>
              <p>
                Each awaited read fetches data. Accessing a handle does not. Snapshots are
                immutable: a rename returns a new repository, and a previous snapshot keeps its old
                values.
              </p>
            </>
          ),
        },
        {
          id: "next",
          title: "Build your first workflow",
          content: (
            <>
              <p>
                Start with <GuideLink to="files">a file change</GuideLink>, then{" "}
                <GuideLink to="pull-requests">open a pull request</GuideLink>. Methods that return
                an operation builder, such as{" "}
                <code>content.commitChanges()</code>, run when you call <code>.execute()</code>.
              </p>
              <p>
                Every guide lists its methods and links to their exact input and return types.
                Examples after this page assume an authenticated <code>git</code>{" "}
                client or a fetched <code>repo</code>{" "}
                from the setup above. They perform real operations on the host you selected.
              </p>
              <p>
                For provider-specific endpoints, use{" "}
                <GuideLink to="native-access">native access</GuideLink> or a{" "}
                <GuideLink to="raw-clients">generated REST client</GuideLink>.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
