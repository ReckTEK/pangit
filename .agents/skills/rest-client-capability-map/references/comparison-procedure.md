# Detailed comparison procedure

## Contents

1. Define the comparison unit.
2. Inspect a source operation completely.
3. Search for equivalent tasks.
4. Decide direct, composite, partial, or absent behavior.
5. Walk Gitea and every remaining provider.
6. Close residuals and resume safely.

## 1. Define the comparison unit

A row represents a **task with an observable outcome**, not an API method spelling or a broad
product category. Define its resource, action, scope, required inputs, preconditions, and completion
result.

Good distinctions include “list branches in one repository,” “read one branch,” “create a branch at
a known commit,” and “set branch protection.” Do not merge them into “branch support.” Similarly,
creating an issue, changing its title, closing it, reopening it, and adding a label can require
separate task rows even if one provider exposes some of them through a single update method.

Use this task signature:

```text
Actor/authorization + resource + action + scope + minimum input
  -> observable result + completion semantics
```

Define the common task narrowly enough that every claimed match satisfies it. Provider-specific
fields that add behavior become extension tasks. Fields that merely encode the same behavior
differently stay in input/output mapping details. Inspect all material fields; do not create a new
“function” for every passive response property.

Maintain a stable task ID separate from its human title, for example `repository.branch.create`.
Renaming a task must not lose evidence. Changing its contract invalidates old comparisons until they
are reviewed against the revised contract. Similarity is not transitive: A resembling B and B
resembling C does not prove that A and C implement the same promise.

## 2. Inspect each source operation completely

For the next inventory operation, read its generated method, normalized path item/operation, and all
referenced shapes needed to understand the contract. Keep the raw schema available for ambiguities.
Use this checklist, recording facts rather than merely ticking boxes:

| Dimension            | Inspect and record                                                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Callable identity    | Provider, client version, class, exact method, operation ID, source key, verb, original and normalized route                                              |
| Purpose              | Summary, full description, tags, examples, explicit exceptions                                                                                            |
| Resource and scope   | Repository/project/workspace/org/user/instance boundaries; parent ownership; lookup identifiers                                                           |
| Inputs               | Inherited and operation parameters; required/optional fields; defaults; nullable/omitted distinctions; enums; validation and size constraints             |
| Request schemas      | Every material property and nested `$ref`; `allOf`, `oneOf`, `anyOf`, discriminator branches, arrays, additional properties; form/multipart/binary bodies |
| Behavioral selectors | State transitions, filter flags, scope selectors, query-bearing alternate paths, body modes, optional path groups, wildcards                              |
| Authorization        | Security schemes and scopes, role requirements, administrator-only behavior, feature/tier/hosting restrictions when documented                            |
| Output               | Documented statuses, response bodies and fields, headers, pagination, media types, redirects, streams/downloads, undocumented response escape hatches     |
| Semantics            | Atomicity, idempotency, concurrency/preconditions, sync/async completion, ordering, filtering reach, visibility, destructive effects                      |
| Lifecycle            | Deprecation, replacement routes, preview/API-version requirements, version-specific removals/additions                                                    |

Resolve `$ref` with a visited-reference set to avoid cycles. A recursive model is not permission to
skip the fields that change the task. Path-level and operation-level contracts can differ; inspect
effective overrides. Response type aliases alone can conceal different statuses or data envelopes.

List each material behavior exposed by a multi-purpose operation. For example, a documented update
field may separately close a request, change a target branch, or change visibility. Give each
behavior a task membership or explain why it is only a representation detail. The operation's
residual review must state what was examined and where its extra behavior was recorded.

## 3. Find candidates without trusting names

Build an index over every client's operation names, operation IDs, tags, paths, summaries,
descriptions, parameter names, and important schema/resource names. Keep the full source accessible;
the compact documentation index drops descriptions.

For each task, search all other clients using several vocabularies:

1. Exact resource/action terms and obvious route families.
2. Domain synonyms and provider-native names.
3. Inputs and output shape that reveal the same outcome under a different method.
4. Related operations that may implement a documented sequence or a body-selector variant.
5. The nearest plausible candidates when no direct match appears.

Useful **search hints, not equivalence claims**:

| Concept            | Candidate vocabulary                                   | Important distinction                                                                 |
| ------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Repository         | repo, repository, GitLab project, Azure git repository | A planning project or repository container is not automatically a repository          |
| Change proposal    | pull request, merge request                            | Draft states, merge strategies, approvals, review ownership and completion can differ |
| Branch/tag/ref     | branches, tags, refs, references                       | Updating a ref is not necessarily atomic branch creation or a protected-branch change |
| Review/comment     | review, discussion, note, thread, inline comment       | General comments, commit comments, and line-positioned reviews have different context |
| Membership/access  | collaborator, member, permission, role, team, group    | User membership, repository access and organization role are separate tasks           |
| Execution          | actions, workflow, pipeline, job, build, run           | Different resource hierarchies; Azure's current raw client includes Git only          |
| Status             | commit status, check, status context, check run        | Rich checks and simple status flags are not fully interchangeable                     |
| Release/artifact   | release, tag, download, attachment, asset, package     | A Git tag is not a release; a release asset is not a CI artifact                      |
| Organization       | org, group, workspace, project collection              | Containment, membership inheritance and visibility differ                             |
| Repository content | contents, file, item, blob, tree, commit               | Reading bytes, walking a tree and committing changes are different operations         |

Use a domain checklist to prevent omission, but never treat it as the inventory itself: repositories
and settings; refs/branches/tags; commits/diffs/trees/blobs/files; forks and transfers; issues and
tracking; pulls/merge requests/reviews; comments/discussions; labels/milestones/projects; users and
identity; organizations/groups/teams/workspaces; permissions; keys/tokens; webhooks and hooks;
CI/actions/pipelines/jobs/runners; statuses/checks; releases/assets/packages; secrets/variables;
search; notifications/subscriptions; wikis; migrations/mirrors; administration, quotas, and
metadata. Add unfamiliar domains found in any provider instead of forcing them into this initial
list.

For each candidate, read its actual contract using the same inspection checklist. Do not certify a
mapping from a grep hit, a similar `operationId`, or shared ancestry. Record why rejected candidates
fail: wrong actor/scope, missing input capability, different result, weaker guarantees, or a feature
not exposed by the raw client.

## 4. Decide and explain the mapping

### Direct

One callable operation achieves the defined outcome. Different names, routes, IDs, JSON wrappers,
and parameter structures do not prevent a direct semantic match. Explain the mapping concretely:

```text
Task input -> provider parameter/body field -> representation conversion/lookup
Provider result/status -> task result -> information retained or unavailable
```

Keep provider-native spellings. A known ID-to-name lookup is an extra prerequisite or operation, not
an unexplained adapter. Do not pretend both providers expose the same type, enum, pagination, or
authorization surface.

### Composite

A documented sequence of **two or more calls** to exposed client operations achieves the task. The
same method may appear in several steps with different inputs. Record ordered `steps`, values passed
from each step to the next, prerequisites, failure handling, concurrency/atomicity limitations,
extra round trips, and completion checks. Keep `operationIds` as the unique endpoint membership
list.

Do not invent an unbounded search, unsupported API call, UI action, GraphQL call, shell operation,
or generic raw-fetch escape hatch to fill a gap in the REST clients. Client-side filtering counts
only if it can actually traverse the defined result scope, and its cost/visibility limits must be
explicit. Creating a resource then updating it does not equal atomic creation with those settings
when atomicity is part of the task.

A sequence may qualify for a shared **task** even though it is not a shared single-call function;
mark it clearly as composite. Narrow the task or move it to extensions if the sequence cannot meet
the promised result or guarantees.

### Partial correspondence

Use partial correspondence during investigation, but do not leave an ambiguous partial fit as a
completed shared row. Split into:

- The precise shared primitive both providers can perform.
- The richer or differently scoped behavior as one or more extension tasks.

For the richer task, the weaker candidate is an explicitly rejected/limited alternative in the
absence search record, with its shortfall explained. The weaker operation still appears under its
actual supported tasks. This prevents both false universal claims and loss of useful overlap.

Example reasoning only: when one provider supplies a general update operation with several state
transitions and another supplies only a close operation, compare the close task directly and analyze
the remaining transitions separately. Do not assert particular provider matches without inspecting
their current sources.

### Absent or unresolved

Use `absent` only after searching the whole target client's indexed surface, reviewing relevant
families and plausible candidates, and ruling out a supported composite. Save search terms,
candidate IDs (empty only if no plausible candidates exist), evidence, and a specific reason.

Describe absence as “not represented in this analyzed client/schema snapshot,” or cite explicit
documented lack of support. An operation elsewhere in a platform but outside this client's source
scope is still absent from this map. Keep that scope explanation visible in the spreadsheet.

Use `unknown` for insufficient or conflicting evidence. It blocks final completion. Do not use
“probably unsupported,” a failed search on one name, or an untested live error as an absence proof.

## 5. Execute the full comparison loop

### Pass A: Gitea as the initial task vocabulary

1. Walk every selected-version Gitea operation, typically 10–25 at a time; reduce batch size for
   complex schemas. Inventory order guarantees a resumable cursor, not semantic grouping.
2. Define atomic tasks and compare each task against every other versioned client, including older
   Gitea. Save confirmed mappings and unresolved questions immediately.
3. Review other Gitea versions operation by operation. Check both added and missing operations and
   contract changes under unchanged method names. Record per-version differences, never an implied
   provider-wide union of incompatible releases.

### Pass B: Every provider seeds additional tasks

Visit Codeberg, GitHub, GitLab, Bitbucket, Azure DevOps, then newly discovered providers. For each
client, walk the full operation inventory, not just operations unmatched in Pass A:

1. Check whether an existing task really captures this operation's behavior.
2. Check all material parameter/body variants and extra output/guarantee capabilities.
3. Add a task for any residual capability, then compare it across **all** other clients immediately
   or add an explicit all-client work item before continuing.
4. Revisit earlier definitions if this provider reveals that a shared task was too broad or too
   narrow. Recheck all affected mappings; never mechanically copy the old classification.
5. Record one completed review for this operation only after all task memberships and residuals are
   accounted for.

A task absent from Gitea but shared by GitHub and GitLab belongs to **Provider Extensions**, labeled
as subset-shared. It is neither dropped nor called unique to GitHub. Two versions of the same
provider do not constitute two supporting providers.

### Pass C: Fixed-point closure

Repeat until there are no new/split/redefined tasks awaiting comparison and all coverage gates pass:

```text
for each client in Gitea-first order:
    for each operation in its full inventory:
        inspect operation and all material behavior
        assign/verify all task memberships and residual accounting
        for every new or revised task:
            compare against every client, including already visited clients
        persist the batch and current queue
resolve open decisions and rerun the audit
```

The final gate is set reconciliation, not “no more interesting examples”:

```text
inventory operation IDs = unique completed operation-review IDs
each operation's review memberships = its supported task mappings
each task's compared client IDs = inventory client IDs
unresolved decisions = unreviewed operations = unassigned residual capabilities = 0
```

## 6. Checkpoints, source drift, and semantic review

Persist task definitions, decisions, evidence, and review status after every batch. A checkpoint
must identify the next exact operation/task, not just “continue GitLab.” Use the checkpoint contract
in `ledger-and-workbook.md`: the earliest unreviewed inventory operation is the resume cursor,
including operations before a manually selected seed. On resume, compare source fingerprints and
additional evidence hashes before reusing conclusions. Changed sources require refreshed inventory
or affected evidence reviews; unchanged sources do not justify redoing completed work.

Track progress separately: operations inventoried; operations fully reviewed; task/client decisions
completed; shared tasks; extension tasks; unresolved decisions. A method can map to multiple tasks;
do not sum task memberships and call that operation coverage.

An independent reviewer should challenge actual evidence for shared-base promises, composite
sequences, absent candidates, version limitations, and provider-only assertions. Automated closure
checks cannot determine whether two APIs mean the same thing. Use representative visual sampling
only after complete data reconciliation; a sample of operations cannot prove full inventory
coverage.
