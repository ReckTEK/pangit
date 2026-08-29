# Authentication and authorization API plan

PanGit supports every REST authentication path exposed by the supported providers. The paths do not
share one fake credential input. They share one result: an authorized PanGit REST client.

```text
OAuth login ───────────────┐
PAT / API token ───────────┼─→ authorized PanGit REST client
Basic authentication ─────┘
```

SSH keys are separate. They authenticate Git-over-SSH clone, fetch, and push operations; they do not
authenticate REST requests.

## Provider surface

| Authentication path  | Gitea | Codeberg | GitHub | GitLab | Bitbucket Cloud | Azure DevOps |
| -------------------- | :---: | :------: | :----: | :----: | :-------------: | :----------: |
| PAT / API token      |   ✓   |    ✓     |   ✓    |   ✓    |        ✓        |      ✓       |
| OAuth login          |   ✓   |    ✓     |   ✓    |   ✓    |        ✓        |      ✓       |
| Basic / app-password |   ✓   |    ✓     |   ✕    |   ✕    |        ✓        |      ✕       |

## Common core

### OAuth login

`login` is common across every supported provider. The caller supplies no user credential.

```text
PanGit starts the selected provider's login hop
→ the provider authenticates the user, including its MFA or SSO
→ the provider authorizes API access
→ the provider returns a one-time authorization code
→ PanGit exchanges that code for an API token
→ PanGit returns an authorized REST client
```

OAuth application registration data such as client ID, callback URL, and a client secret or PKCE
configuration is host/application configuration. It is not the user's login credential.

### PAT / API token

`token` is common across every supported provider. The caller already has a provider-issued token.
PanGit applies it using the selected provider's required REST authentication format and returns an
authorized REST client.

## Provider-specific switches

Basic authentication does not have one universal payload. It uses fluent provider branches specific
to that authentication operation. All branches may be declared; only the branch matching the
selected provider executes.

```text
basic
├─ gitea
├─ codeberg
└─ bitbucket
```

Each branch exposes only its provider's actual fields and behavior.

## Shared OAuth callback

Every OAuth application can return to the same callback endpoint. The callback URL registered for
each provider includes a provider discriminator:

```text
/auth/callback?type=github
/auth/callback?type=gitlab
/auth/callback?type=gitea
/auth/callback?type=codeberg
/auth/callback?type=bitbucket
/auth/callback?type=azure-devops
```

All variants route through one `OAuthHandler`. The handler reads `type`, selects the matching
configured login, validates the caller-retained transaction and OAuth state, exchanges the returned
authorization code, and completes the login flow. The `type` parameter selects the adapter; the
unpredictable `state` correlates and protects the individual attempt.

```ts
const gitea = PanGit.createClient("gitea", "1.27.2", {
  baseUrl: "http://127.0.0.1:3300/api/v1",
});

const oauth = PanGit.createOAuthHandler({
  gitea: gitea.auth.login({
    clientId,
    callbackUrl: "http://127.0.0.1:5173/auth/callback",
    scopes: ["read:user"],
  }),
});

const { url, transaction } = await oauth.start("gitea");
// Send the user to `url`, retain `transaction`, then pass the callback Request back:
const authorized = await oauth.authorize(request, transaction);
```

The registry and callback request are provider-neutral. Gitea is the first implemented OAuth
adapter; the remaining providers join the same registry as their adapters are implemented.

## Runtime-neutral integration

PanGit is a library. It does not run a server and does not own transaction, token, cookie, or
session storage.

The OAuth implementation is shared; the consuming environment supplies the runtime bridge:

| Environment        | Temporary transaction owner | Integration                                                 |
| ------------------ | --------------------------- | ----------------------------------------------------------- |
| Browser            | Browser storage             | Navigate to login; pass the callback URL as a `Request`.    |
| Deno desktop / CLI | Process memory              | Open a browser; pass the loopback listener's raw `Request`. |
| Server application | Application cookie/session  | Pass the application's callback route's raw `Request`.      |

`Deno.serve`, React Router, Hono, and other Fetch-based runtimes can pass their native `Request`
directly to `oauth.authorize`. PanGit returns the authorization result; the application decides its
own `Response`.

After authentication, PanGit returns the authorization result to the consuming application. The
application chooses whether to keep it in memory, store it, create its own cookie/session, or
discard it. PanGit does not silently persist it.

## Terminology

| Term                   | Meaning in this plan                                                               |
| ---------------------- | ---------------------------------------------------------------------------------- |
| Login                  | The complete user-facing OAuth hop that begins without a user credential.          |
| Authentication         | The overall PanGit system covering login, token, and Basic paths.                  |
| Authorization          | The OAuth step where the provider grants API access after authenticating the user. |
| Authorized REST client | The common result of every supported REST authentication path.                     |
