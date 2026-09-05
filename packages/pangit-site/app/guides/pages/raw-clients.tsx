import { GuideLink, guideMeta, GuidePage } from "../mod.ts";
import { CodeSnippet } from "../../components/code-snippet.tsx";

export const meta = guideMeta("raw-clients");

export default function Guide() {
  return (
    <GuidePage
      slug="raw-clients"
      sections={[
        {
          id: "choose",
          title: "Choose a generated client",
          content: (
            <>
              <p>
                Generated REST clients preserve the complete provider contract: endpoint methods,
                path and query parameters, request bodies, response status codes, and schemas. Use
                them directly or through a fluent client’s{" "}
                <GuideLink to="native-access">native callback</GuideLink>.
              </p>
              <CodeSnippet file="fluent/raw-client.ts" />
              <p>
                Raw clients need the complete API base URL. Unlike fluent authentication, raw
                headers use the provider’s native scheme. The version{" "}
                <code>latest</code>, where offered, names a checked-in schema snapshot; it does not
                resolve a server’s newest version at runtime.
              </p>
            </>
          ),
        },
        {
          id: "requests",
          title: "Build requests from the method signature",
          content: (
            <>
              <p>
                A generated method takes its declared input groups, such as <code>path</code>,{" "}
                <code>query</code>, <code>headers</code>, and{" "}
                <code>body</code>. Required groups stay required in TypeScript. Use the searchable
                method index to find the exact operation; its reference links to the request
                parameters, body schema, and documented responses.
              </p>
              <p>
                Optional request settings include cancellation through{" "}
                <code>signal</code>. Binary and multipart operations retain the generated
                operation’s body and decode contract rather than converting everything to JSON.
              </p>
            </>
          ),
        },
        {
          id: "transport",
          title: "Transport options",
          content: (
            <>
              <p>
                Configure the client once, or pass per-request options as the method’s second
                argument. Generated methods keep their declared response type; they do not accept a
                parseAs override.
              </p>
              <dl className="definition-list">
                <dt>baseUrl, headers, query</dt>
                <dd>
                  Set the API root and default request values. Headers can be a HeadersInit value or
                  an asynchronous provider receiving operation and request context. Fluent clients
                  own their authentication headers.
                </dd>
                <dt>fetch, beforeRequest, afterResponse</dt>
                <dd>
                  Inject Fetch, transform a Request before default headers are applied, or
                  observe/replace a Response before parsing. Hooks receive the operation and request
                  context, including the abort signal.
                </dd>
                <dt>throwOnError</dt>
                <dd>
                  Opt into RestApiError for non-2xx responses. Otherwise inspect the returned status
                  union. Per-request options can override this setting.
                </dd>
                <dt>useOperationServers, headerForwarding</dt>
                <dd>
                  Honor absolute operation-level servers when enabled. headerForwarding selects all
                  targets or same-origin for configured headers. Choose the policy deliberately when
                  a provider uses another origin for uploads.
                </dd>
                <dt>Per-request options</dt>
                <dd>
                  Pass signal and Fetch request settings, or explicit baseUrl, body, headers,
                  mediaType, query, and throwOnError overrides. A body override must match the
                  endpoint contract.
                </dd>
              </dl>
            </>
          ),
        },
        {
          id: "responses",
          title: "Handle the response envelope",
          content: (
            <>
              <p>
                Responses retain <code>status</code>, <code>ok</code>, <code>documented</code>,{" "}
                <code>headers</code>, and{" "}
                <code>body</code>. Narrow on documented success before reading a success-only field.
                A 2xx response can still be undocumented for the selected schema; a documented error
                response is still an HTTP failure.
              </p>
              <p>
                Standalone provider entry points export <code>isRestSuccess</code>,{" "}
                <code>isRestDocumentedSuccess</code>, and{" "}
                <code>unwrapRestResponse</code>. The unwrap helper throws for an HTTP error or
                undocumented response instead of returning an assumed success body. Decode failures
                throw while the response is being read. Transport and decoding failures use the raw
                client error types, not the fluent error hierarchy.
              </p>
            </>
          ),
        },
        {
          id: "explorer",
          title: "Use the browser reference",
          content: (
            <>
              <p>
                Open a provider/version from the Raw REST clients navigation. The API reference
                contains a searchable request explorer; the Client methods tab indexes the generated
                TypeScript names. Both describe the same pinned specification.
              </p>
              <ol>
                <li>
                  Select your server. Self-hosted references need a complete Custom API server URL,
                  such as <code>https://git.example.com/api/v1</code>.
                </li>
                <li>
                  Choose the endpoint and supply its native authentication. Gitea’s
                  AuthorizationHeaderToken scheme expects the complete <code>token …</code> value.
                </li>
                <li>
                  Fill in parameters and inspect the request before choosing Test Request. Write
                  endpoints perform real writes.
                </li>
              </ol>
              <p>
                The browser connects directly to that server. It must allow the documentation origin
                through CORS and use a compatible HTTPS policy. The site does not proxy requests or
                persist credentials. Changing the reference or resolved theme resets the interactive
                client and its in-memory credentials.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
