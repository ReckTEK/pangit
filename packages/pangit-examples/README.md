# PanGit examples

Start or resume the local provider sandbox and example site:

```sh
docker compose up
```

The Compose-hosted site is available at <http://127.0.0.1:5173>. It contains one Gitea login using
PanGit's shared client and generic request transport. PanGit creates, encrypts, validates, expires,
and clears the short-lived OAuth transaction cookie; the site only supplies configuration and its
success/error response.

| Provider | URL                     | Username  | Password                 |
| -------- | ----------------------- | --------- | ------------------------ |
| Gitea    | <http://127.0.0.1:3300> | `sandbox` | `gitea-sandbox-password` |

The Gitea database, repositories, login sessions, tokens, and OAuth application live in named
volumes and are reused across stop/start cycles. OAuth tokens remain runtime values and are not
printed or committed.

Stop the containers without deleting their provider data:

```sh
docker compose down
```

Downloaded images remain cached.
