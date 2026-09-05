import { GuideLink, guideMeta, GuidePage, MethodTable } from "../mod.ts";
import { CodeSnippet } from "../../components/code-snippet.tsx";
import { authentication, cookie, flow, handler, login } from "../methods/authentication.ts";

export const meta = guideMeta("authentication");

export default function Guide() {
  return (
    <GuidePage
      slug="authentication"
      sections={[
        {
          id: "tokens",
          title: "Use a token for scripts",
          content: (
            <>
              <p>
                <code>await connection.auth.token(token)</code>{" "}
                verifies the credential against the selected host and returns a new authenticated
                client. The original connection stays unchanged. Give the token permissions for the
                operations you actually need; a valid identity does not imply write permission.
              </p>
              <p>
                Fluent clients own authentication headers. Pass credentials through{" "}
                <code>auth</code>; use <code>FluentClientOptions</code>{" "}
                for transport options such as <code>baseUrl</code>, <code>fetch</code>, and{" "}
                <code>webBaseUrl</code>. Shared REST options also include query defaults,
                beforeRequest and afterResponse hooks, throwOnError, useOperationServers, and
                headerForwarding; see the{" "}
                <GuideLink to="raw-clients">transport reference</GuideLink>. A separate{" "}
                <code>webBaseUrl</code>{" "}
                selects the browser-facing root for OAuth when it differs from the API address.
              </p>
              <MethodTable {...authentication} />
            </>
          ),
        },
        {
          id: "basic",
          title: "Basic credentials",
          content: (
            <>
              <p>
                On Gitea and Forgejo, use{" "}
                <code>{`await connection.auth.basic({ username, password }).authorize()`}</code>. If
                the server requires an OTP, use its typed{" "}
                <GuideLink to="native-access">authentication extension</GuideLink>. GitLab
                password-based Basic authentication is unavailable; use a token or OAuth.
              </p>
            </>
          ),
        },
        {
          id: "oauth",
          title: "OAuth in a web application",
          content: (
            <>
              <p>
                Register the exact callback URL with your provider. Keep the OAuth client secret and
                cookie secret on your server. The handler below uses native <code>Request</code> and
                {" "}
                <code>Response</code> objects and can be mounted in your HTTP framework.
              </p>
              <CodeSnippet file="fluent/oauth.ts" />
              <p>
                The example scopes are Gitea scopes; select scopes appropriate to your provider and
                application. The helper owns the OAuth transaction only. Your application owns login
                sessions, logout, token storage, and token refresh. A successful callback returns
                {" "}
                <code>authorization</code>{" "}
                with the access token and any supplied refresh token, expiry, and scope.
              </p>
              <p>
                Cookies are encrypted and HttpOnly. The defaults are name{" "}
                <code>pangit_oauth</code>, callback pathname, SameSite Lax, a 600-second lifetime,
                and Secure when the callback is HTTPS. Configure <code>name</code>,{" "}
                <code>path</code>, <code>domain</code>, <code>secure</code>,{" "}
                <code>sameSite</code>, or <code>maxAgeSeconds</code>{" "}
                when your deployment requires it. <code>redirectStatus</code> may be 302 or 303.
              </p>
              <MethodTable {...handler} />
              <MethodTable {...flow} />
            </>
          ),
        },
        {
          id: "custom-storage",
          title: "Bring your own transaction storage",
          content: (
            <>
              <p>
                Use <code>login.start()</code> and <code>login.authorize()</code>{" "}
                directly if your application already stores transient login state. Retain the whole
                transaction, including state and the PKCE verifier, bind it to the initiating
                browser, expire it promptly, and consume it once. For cookie storage without
                redirect orchestration, use <code>auth.createOAuthTransactionCookie(options)</code>.
              </p>
              <MethodTable {...login} />
              <MethodTable {...cookie} />
              <p>
                <code>auth.OAuthCallbackError</code> exposes a machine-readable <code>code</code>
                {" "}
                for callback or transaction failures. Cookie-flow failures are returned through{" "}
                <code>ok: false</code>; low-level authorization failures throw.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
