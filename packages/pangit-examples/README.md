# PanGit examples

Start the local authentication sandbox:

```sh
deno task start
```

This starts fresh Gitea and GitLab containers, creates their local users and personal access tokens,
and runs the unchanged Gitea example against the real Gitea API. The services remain available after
verification:

| Provider | URL                      | Username  | Password                 |
| -------- | ------------------------ | --------- | ------------------------ |
| Gitea    | <http://localhost:3300>  | `sandbox` | `gitea-sandbox-password` |
| GitLab   | <http://localhost:38080> | `root`    | `7vQ9!mZ4-Lk2@xR8#pT6`   |

The Gitea token is generated inside the disposable sandbox and verified by the example runner. The
fixed GitLab token is `glpat-pangit-example-token-000001`. These credentials are only for the local
sandbox.

Remove every sandbox container, network, and volume with:

```sh
deno task stop
```

Downloaded images remain cached.
