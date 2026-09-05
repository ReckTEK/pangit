import { GuideLink, guideMeta, GuidePage } from "../mod.ts";
import { CodeSnippet } from "../../components/code-snippet.tsx";

export const meta = guideMeta("native-access");

export default function Guide() {
  return (
    <GuidePage
      slug="native-access"
      sections={[
        {
          id: "extensions",
          title: "Add options to a portable operation",
          content: (
            <>
              <p>
                An extension configures a universal operation with options specific to the selected
                provider/version. It exposes only that provider’s supported method. This Gitea
                1.27.2 example requests a raw diff instead of normalized commit objects.
              </p>
              <CodeSnippet file="fluent/extensions.ts" />
              <p>
                The callback receives immutable operation context and returns typed options. It runs
                when you configure the extension. The provider request runs when you call{" "}
                <code>execute()</code>. An operation can be configured once; the returned terminal
                object exposes <code>execute</code>{" "}
                only. Calling execute again runs the operation again.
              </p>
              <p>
                This is not a runtime switch that silently skips other providers. A GitLab client
                exposes its supported <code>.gitlab()</code> extension; it has no{" "}
                <code>.gitea()</code>{" "}
                method. Keep provider-specific branches at the boundary of a shared workflow.
              </p>
            </>
          ),
        },
        {
          id: "available",
          title: "Available extension points",
          content: (
            <>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Operation</th>
                      <th>Additional controls</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <code>auth.basic</code>
                      </td>
                      <td>Gitea/Forgejo OTP; terminal method is authorize().</td>
                    </tr>
                    <tr>
                      <td>
                        <code>content.commitChanges</code>
                      </td>
                      <td>Provider commit metadata and branch controls.</td>
                    </tr>
                    <tr>
                      <td>
                        <code>statuses.set</code>
                      </td>
                      <td>Provider-specific status states.</td>
                    </tr>
                    <tr>
                      <td>
                        <code>pullRequests.merge</code>
                      </td>
                      <td>Merge methods, expected head, messages, and supported scheduling.</td>
                    </tr>
                    <tr>
                      <td>
                        <code>pullRequestReviews.create</code>
                      </td>
                      <td>Gitea/Forgejo review events and rich comment positions.</td>
                    </tr>
                    <tr>
                      <td>
                        <code>commits.compare</code>
                      </td>
                      <td>Gitea 1.27.2 diff/patch output.</td>
                    </tr>
                    <tr>
                      <td>
                        <code>issues.update</code>
                      </td>
                      <td>Gitea content-version guard.</td>
                    </tr>
                    <tr>
                      <td>
                        <code>branchRules.setOrder</code>
                      </td>
                      <td>Gitea rule priority.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                Scheduled merge options require an explicit completion polling bound. Extension
                types and supported fields are exported from each standalone entry point:{" "}
                <code>@recktek/pangit/fluent/gitea</code>, <code>/forgejo</code>, or{" "}
                <code>/gitlab</code>.
              </p>
            </>
          ),
        },
        {
          id: "native",
          title: "Use the full native REST client",
          content: (
            <>
              <p>
                Use <code>native</code>{" "}
                when the universal contract cannot express an operation. The callback receives the
                exact selected version’s generated client and, on entities, the original provider
                payload. The request and response remain provider-native.
              </p>
              <CodeSnippet file="fluent/native.ts" />
              <p>
                Client-level native access exposes <code>client</code>. Repository access adds{" "}
                <code>repository</code>; entity handles provide the corresponding native payload. A
                callback can be synchronous or asynchronous and returns its result to the caller.
              </p>
              <p>
                Raw HTTP failures return response envelopes by default; a configured throwOnError
                option changes that behavior. Check <code>documented</code> and{" "}
                <code>ok</code>, or use the response helpers described in{" "}
                <GuideLink to="raw-clients">generated REST clients</GuideLink>.
              </p>
            </>
          ),
        },
        {
          id: "loading",
          title: "Keep provider loading isolated",
          content: (
            <>
              <p>
                The asynchronous <code>createClient(provider, version, options)</code>{" "}
                factory dynamically loads the selected standalone provider. Its generated transport
                remains lazy until needed. A direct import from{" "}
                <code>@recktek/pangit/fluent/gitea</code> instead exposes synchronous{" "}
                <code>createClient(version, options)</code>, since that provider is already
                imported. Its version-specific REST client remains lazy.
              </p>
              <p>
                The universal contract contains shared concepts. Provider payloads, options, and
                implementation details stay in the provider’s folder and standalone exports.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
