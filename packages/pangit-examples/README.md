# PanGit examples

Start or resume the local provider sandbox and example site:

```sh
docker compose up --detach --wait
```

The Compose-hosted site is available at <http://127.0.0.1:5173>. It contains one Gitea login using
PanGit's shared client and generic request transport.

GitLab remains available in the same provider sandbox but is not part of this minimal login page.

| Provider | URL                      | Username  | Password                 |
| -------- | ------------------------ | --------- | ------------------------ |
| Gitea    | <http://127.0.0.1:3300>  | `sandbox` | `gitea-sandbox-password` |
| GitLab   | <http://localhost:38080> | `root`    | `7vQ9!mZ4-Lk2@xR8#pT6`   |

Provider databases, repositories, login sessions, tokens, and the Gitea OAuth application live in
named volumes and are reused across stop/start cycles. OAuth tokens remain runtime values and are
not printed or committed.

Stop the containers without deleting their provider data:

```sh
docker compose down
```

Downloaded images remain cached.
