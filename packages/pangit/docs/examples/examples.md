# Examples

Handwritten tutorials for using PanGit from your own Deno project. Each area of concern has its own
guide, explained code snippets, and complete source files you can copy into your project.

## Raw REST clients — Gitea 1.27.2

Assume `@mannsion/pangit` is published on JSR. These examples import that package and connect
directly to an existing Gitea 1.27.2 instance, the newest Gitea version supported here. Follow the
lessons in order, or finish client setup and jump to a workflow.

**[Start the tutorial: set up the raw client](raw-clients/gitea/1.27.2/getting-started/getting-started.md)**

| Lesson | Area of concern                                                                                                  | What you will do                                                            |
| ------ | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1      | [Set up the raw client](raw-clients/gitea/1.27.2/getting-started/getting-started.md)                             | Add the JSR package, connect to your server, and make your first request.   |
| 2      | [Create a private repository](raw-clients/gitea/1.27.2/repository-setup/repository-setup.md)                     | Initialize a private repository, labels, a milestone, and a planning issue. |
| 3      | [Inventory your repositories](raw-clients/gitea/1.27.2/repository-inventory/repository-inventory.md)             | Read every page of accessible projects and collect clone URLs.              |
| 4      | [Submit content through a pull request](raw-clients/gitea/1.27.2/content-pull-requests/content-pull-requests.md) | Commit a local file on a new branch and open a reviewable PR.               |
| 5      | [Triage an issue](raw-clients/gitea/1.27.2/issue-triage/issue-triage.md)                                         | Preserve existing labels while adding a triage label and your note.         |
| 6      | [Publish a release and its artifact](raw-clients/gitea/1.27.2/releases/releases.md)                              | Upload an artifact to a draft, then publish the release.                    |
| 7      | [Report external CI status](raw-clients/gitea/1.27.2/ci-status/ci-status.md)                                     | Post an actual job result and inspect the combined commit status.           |
| 8      | [Connect a webhook](raw-clients/gitea/1.27.2/webhooks/webhooks.md)                                               | Create or update the named hook for an existing receiver.                   |

Each guide links back here and to adjacent lessons. Save its example files in your own project and
run the commands there. The docs folders separate API layers, providers, versions, and concerns; the
examples are maintained by hand.
