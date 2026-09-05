import { guideMeta, GuidePage } from "../mod.ts";
import { CodeSnippet } from "../../components/code-snippet.tsx";

export const meta = guideMeta("pagination-errors");

export default function Guide() {
  return (
    <GuidePage
      slug="pagination-errors"
      sections={[
        {
          id: "pages",
          title: "Fetch one page at a time",
          content: (
            <>
              <p>
                List methods return <code>Page&lt;T&gt;</code>: <code>items</code>, an optional{" "}
                <code>nextCursor</code>, and <code>totalCount</code>{" "}
                only when the host supplies it. The default requested page size is 50. Choose a
                positive <code>limit</code> and keep it unchanged when continuing a cursor.
              </p>
              <CodeSnippet file="fluent/pagination.ts" />
              <p>
                Cursors are opaque. Keep the same provider, version, repository, filters, and page
                size for a continuation. Do not parse a cursor, invent one, or treat it as a page
                number. Local filtering may return no items while still returning{" "}
                <code>nextCursor</code>; stop when the cursor is absent, not when the items array is
                empty.
              </p>
            </>
          ),
        },
        {
          id: "bounded",
          title: "Respect bounds and completeness",
          content: (
            <>
              <p>
                <code>ScanPage&lt;T&gt;</code> additionally reports{" "}
                <code>complete</code>. A bounded slice can end before the collection does. Callers
                own aggregation and any further requests. <code>maxItems</code>,{" "}
                <code>maxRequests</code>, <code>maxDepth</code>, <code>maxRules</code>, and{" "}
                <code>maxFiles</code>{" "}
                make expensive work explicit where the relevant method accepts them.
              </p>
              <p>
                Request bounds are not proof of atomicity. Some reads combine multiple provider
                calls. A method marked <code>one-page-derived</code>{" "}
                can filter or hydrate a native page, and a <code>bounded</code>{" "}
                operation can inspect multiple records within a ceiling.
              </p>
            </>
          ),
        },
        {
          id: "cancel",
          title: "Cancel or set a deadline",
          content: (
            <>
              <p>
                Pass an <code>AbortSignal</code>{" "}
                through the operation’s options. For a builder, pass it to{" "}
                <code>{`execute({ signal })`}</code>. Batches cancel their own outstanding requests
                after a failure. Cancellation cannot undo a mutation already accepted by the host.
              </p>
              <p>
                The following example also imports <code>errors</code> from{" "}
                <code>@recktek/pangit/api</code>.
              </p>
              <CodeSnippet file="fluent/errors.ts" />
            </>
          ),
        },
        {
          id: "errors",
          title: "Handle the failure you recognize",
          content: (
            <>
              <p>
                Import the <code>errors</code> namespace from{" "}
                <code>@recktek/pangit/api</code>. Catch a specific error when your application can
                recover; let unrelated failures surface.
              </p>
              <dl className="definition-list">
                <dt>AuthenticationError / PermissionDeniedError</dt>
                <dd>The credential is invalid, or the authenticated user lacks permission.</dd>
                <dt>NotFoundError / ConflictError / ValidationError</dt>
                <dd>
                  The resource is absent, a mutation conflicts, or input is invalid. Local
                  validation may happen before provider selection.
                </dd>
                <dt>RateLimitError</dt>
                <dd>
                  The host has limited requests. The optional retryAfter value preserves its header;
                  choose your own retry policy.
                </dd>
                <dt>OperationAbortedError / OperationTimeoutError</dt>
                <dd>The caller aborted work or an operation’s polling deadline expired.</dd>
                <dt>IncompleteHistoryError</dt>
                <dd>A history query could not establish a complete answer within its bounds.</dd>
                <dt>ContentUnavailableError / ContentReadError</dt>
                <dd>
                  A body cannot be obtained, or local conversion fails. ContentReadError.reason
                  distinguishes not-a-file, bytes-unavailable, invalid-utf8, invalid-json,
                  invalid-media-type, and unknown-media-type.
                </dd>
                <dt>CapabilityUnavailableError</dt>
                <dd>
                  The selected provider/version cannot perform the requested portable operation or
                  option.
                </dd>
                <dt>ProviderInvariantError</dt>
                <dd>
                  A response breaks an assumption the adapter needs to give a trustworthy answer,
                  such as valid pagination.
                </dd>
                <dt>ProviderOperationError / FluentOperationError</dt>
                <dd>
                  Base classes for normalized provider failures and all contextual fluent-operation
                  failures respectively.
                </dd>
                <dt>ProviderAdapterUnavailableError</dt>
                <dd>
                  The requested provider/version has no fluent adapter. Raw-client availability does
                  not imply fluent support.
                </dd>
              </dl>
              <p>
                Context may include <code>provider</code>, <code>version</code>,{" "}
                <code>operation</code>, HTTP <code>status</code>, <code>requestId</code>, and{" "}
                <code>retryAfter</code>. Missing context stays absent. Provider-specific details
                remain in the error cause; avoid exposing credentials or raw error payloads to
                application users.
              </p>
              <p>
                PanGit does not automatically retry failed mutations. Before retrying after a
                timeout or connection failure, inspect the remote result; the host may have accepted
                the first request.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
