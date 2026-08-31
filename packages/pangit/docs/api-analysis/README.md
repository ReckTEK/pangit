# PanGit API map

This folder maps **what belongs in a common API, what is optional, and what stays
provider-specific**. It proposes interfaces; it does not implement them.

| Read                          | Purpose                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| [Core](core.md)               | 25 capability groups shared by every included client, with native method bindings. |
| [Supplements](supplements.md) | Optional shared modules and provider-only capabilities.                            |

The exact reviewed bindings for every proposed core method are in the
[provider method map](core-method-map.md).

## Implementation split

1. **Core:** repository, Git content, pull-request, review-action and commit-status operations
   below.
2. **Optional modules:** reuse an interface where a subset has the same capability; expose support
   explicitly.
3. **Provider supplements:** keep native features and stronger guarantees out of the common
   interface.

Keep raw clients available. Translate identifiers and results in adapters, but do not erase native
permissions, pagination, concurrency guards or asynchronous completion. Similar method names are not
proof of equivalent behavior.

## Scope

| Provider / client source                                                             | Included versions                                                           |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| [Gitea](../../src/providers/gitea/1.27.2/GiteaRestClient.ts)                         | 1.27.2; [1.26.4](../../src/providers/gitea/1.26.4/GiteaRestClient.ts)       |
| [Codeberg / Forgejo](../../src/providers/codeberg/latest/CodebergRestClient.ts)      | Cached `latest`                                                             |
| [GitHub](../../src/providers/github/latest/GitHubRestClient.ts)                      | Cached `latest`                                                             |
| [GitLab](../../src/providers/gitlab/19.3.1/GitLabRestClient.ts)                      | 19.3.1; [18.11.11](../../src/providers/gitlab/18.11.11/GitLabRestClient.ts) |
| [Bitbucket Cloud](../../src/providers/bitbucket/latest/BitbucketRestClient.ts)       | Cached `latest`; not Bitbucket Server                                       |
| [Azure DevOps Git](../../src/providers/azure-devops/latest/AzureDevOpsRestClient.ts) | Git 7.2-preview only                                                        |

Based on the reviewed 5,364-operation snapshot across six providers and eight clients. The core
groups collapse 106 shared tasks; options and aliases are not separate interfaces. These are source
findings, not live interoperability tests. “Absent” means absent from these clients, not the entire
provider platform. Request fields and response types remain in the linked clients; they are not
duplicated here.
