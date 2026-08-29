# Ledger and workbook contract

## Contents

1. Ledger structure and evidence.
2. Task classification and operation coverage.
3. Two-sheet workbook layout and cell detail.
4. Export and verification.

## 1. Ledger structure

Store machine-readable decisions in `ledger.json`; build the workbook from this same data. Begin
with the inventory's exact fingerprint and empty arrays, then append reviewed batches. An empty
ledger is an unfinished analysis, not an empty shared base.

```json
{
  "schemaVersion": 1,
  "sourceFingerprint": "<copy inventory.sourceFingerprint>",
  "tasks": [],
  "operationReviews": []
}
```

The examples in this reference define structure, **not pre-analyzed mappings**. Replace illustrative
values with source-backed facts. `scripts/audit.ts` exports the executable types and closure check.

### Task

| Field         | Required content                                                                          |
| ------------- | ----------------------------------------------------------------------------------------- |
| `id`          | Stable canonical task ID, unique across both sheets                                       |
| `title`       | Clear task phrase used in column A                                                        |
| `domain`      | Navigation/filter family; never a substitute for a task definition                        |
| `intent`      | Resource, action, scope, minimal inputs, preconditions and observable completion contract |
| `bucket`      | `shared` or `extension`, derived from comparisons rather than preference                  |
| `comparisons` | Exactly one comparison for **every inventory client ID**, including all versions          |

### Comparison

While comparisons are unfinished, the task's bucket is provisional. Recompute it when every client
decision is resolved. A known absence cannot remain under `shared`, even in a draft. Unknown cells
may use empty strings and arrays for the required fields; replace them with evidence before closing.

| Field           | Required content                                                                                                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clientId`      | Exact inventory ID, e.g. `gitea@1.27.2`                                                                                                                                                  |
| `status`        | `direct`, `composite`, `absent`, or unfinished `unknown`                                                                                                                                 |
| `operationIds`  | Unique exact inventory IDs of supporting operations, ordered by first use; empty for absence                                                                                             |
| `steps`         | Required for composite mappings: ordered calls, each with `operationId` and a `description` explaining its inputs, output handoff, and role; repeated calls to one operation are allowed |
| `description`   | What these operations do and why that satisfies this task; for absence, the scoped shortfall                                                                                             |
| `inputMapping`  | Task inputs to native path/query/header/body fields, required lookups, encoding, defaults, enums and selectors                                                                           |
| `outputMapping` | Native status/media/body/headers to the task's result, pagination/completion handling and retained/missing information                                                                   |
| `constraints`   | Auth/role/scope/tier/version limits; semantic differences; atomicity/races; deprecated/preview requirements; explicit “None documented” if applicable                                    |
| `evidence`      | Nonempty array of decisive source references                                                                                                                                             |
| `search`        | Required for absence; search terms, plausible candidates and rejection reasoning                                                                                                         |

Each evidence record is:

```json
{
  "source": "codegen/specs/normalized/gitea/1.27.2.json",
  "locator": "#/paths/~1repos~1{owner}~1{repo}/get",
  "note": "Describe the exact source fact supporting this particular decision."
}
```

Use the inventory's JSON Pointer for schema evidence. Use a method line or symbol for client
evidence, and a version/section locator for an official URL. Preserve local relative paths in the
ledger for portability; resolve them for the delivered workbook's source links when useful.

An absence search record is:

```json
{
  "terms": ["task term", "provider-native synonym", "related route family"],
  "candidateOperationIds": [],
  "reason": "State the searched scope, what the closest candidates actually do, and why neither a direct call nor a supported sequence meets the task."
}
```

Candidate IDs must belong to that comparison's client. An empty candidate array means no plausible
candidate was found after the recorded searches, not that the client was skipped. Evidence must
establish the searched inventory boundary and any relevant rejected contracts. Do not use the same
generic “no match” sentence for unrelated providers or tasks.

Final direct mappings need at least one valid supporting operation. Multiple operations listed as
direct mappings are alternatives, each independently sufficient; explain when to choose each.
Composite mappings need at least two ordered `steps`; the set of step operation IDs must equal
`operationIds`. The same operation can occur in several steps. Keep the overall sequence in
`description` and the input/output handoff in each step's description. Omit `steps` for
non-composites. If a task only corresponds partly, split its common primitive and extension; record
the weaker alternative and its limits in the richer task's absence record.

For absent cells, set `inputMapping` and `outputMapping` to an explicit scoped explanation such as
“Not applicable: no exposed operation meets this task.” Do not invent an input/output adapter.
Unknown decisions may be recorded during work, but the final audit rejects them.

### Operation review

Every operation, including one already mapped during another provider's pass, needs exactly one:

```json
{
  "operationId": "<exact inventory operation ID>",
  "taskIds": ["<every supported canonical task membership>"],
  "reviewed": true,
  "residualReview": "Describe the material input variants, output distinctions and guarantees inspected; identify extension task IDs for extra behavior or explain why no material residual remains."
}
```

`taskIds` must equal the operation's actual supported memberships in task comparisons. Rejected
candidates do not count as memberships or as reviewed coverage. A blanket “done” without actual
residual investigation is not adequate evidence, even if a structural validator accepts the string.

### Checkpoint and exact resume behavior

Use this checkpoint structure; replace illustrative placeholders with actual IDs and hashes:

```json
{
  "schemaVersion": 1,
  "sourceFingerprint": "<copy inventory.sourceFingerprint>",
  "phase": "gitea-seed",
  "nextOperationId": "<earliest inventory operation without a completed review>",
  "pendingComparisons": [
    {
      "taskId": "<task requiring comparison or re-comparison>",
      "clientIds": ["<each affected inventory client ID>"],
      "reason": "<new task, changed contract, or unresolved evidence>"
    }
  ],
  "openQuestions": [
    {
      "operationIds": ["<affected operation ID>"],
      "taskIds": ["<affected task ID if already defined>"],
      "question": "<exact unresolved behavior or residual>",
      "nextAction": "<specific source or comparison to inspect next>"
    }
  ],
  "additionalEvidence": [
    {
      "source": "packages/pangit/src/rest/request.ts",
      "sha256": "sha256:<hash of exact file bytes>",
      "taskIds": ["<tasks whose conclusions use this file>"]
    }
  ]
}
```

Allowed phases are `gitea-seed`, `provider-sweep`, and `closure`. Empty queues are `[]`; set
`nextOperationId` to `null` only when every operation review is complete. The client/provider can be
looked up from that stable operation ID instead of duplicating potentially inconsistent cursors.

Derive the resume cursor from the **whole Gitea-first ordered inventory** joined to completed review
IDs. Examining operation 135 as a seed or candidate does not mark operations 0–134 complete. Resume
at the earliest missing/incomplete review, not at 136. Recompute after each merge and on resume;
cross-provider candidate reading can advance individual reviews without advancing a contiguous scan.

Save pending task comparisons and open residual questions separately from the operation cursor. When
a definition or evidence changes, invalidate affected comparisons/reviews and queue them again.
After adding mappings to an already reviewed operation, synchronize its `taskIds` with the actual
supported memberships before running the draft audit. Never discard questions because that method
already appears on a sheet.

The inventory fingerprint does not cover arbitrary additional evidence. When a conclusion uses
transport code, a normalizer, or another local file outside its hashed manifests/specs/clients,
record that file's exact SHA-256 and affected task IDs in `additionalEvidence`. Recheck these hashes
on resume and before final export. A change reopens affected conclusions even if the inventory
fingerprint is unchanged. For external documentation, preserve the fetched evidence and its
version/date provenance; do not treat an unchanged URL as proof of unchanged content.

The audit validates the ledger, not the checkpoint or filesystem freshness. Perform these cursor,
queue, and additional-evidence checks explicitly; they are separate completion gates.

## 2. Classification and coverage

Apply the same explicit universe to both sheets. By default it includes every configured version.

| Classification        | Rule                                                                                    | Worksheet                                    |
| --------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------- |
| Universal shared task | Every client has a `direct` or `composite` mapping for the same task contract           | Shared Base                                  |
| `provider_only`       | Only one distinct provider has any supported client mapping                             | Provider Extensions                          |
| `shared_subset`       | At least two, but not all, distinct providers have supported mappings                   | Provider Extensions                          |
| `version_limited`     | Every provider has a supported version, but one or more included versions lack the task | Provider Extensions                          |
| Unresolved            | Any unknown, missing comparison, contradictory evidence, or unreviewed residual         | In-progress analysis only; blocks completion |

For any `extension` there must be at least one supported client and at least one absent client.
Explain version differences even within provider-only or subset rows; the classification does not
remove that detail. A task supported by nobody is not a capability of this inventory and must not be
included. Two Gitea versions supporting a task still count as one provider.

An operation can contribute to both buckets because task granularity and function granularity are
different. For example, its common update behavior can appear on Shared Base and its specialized
input mode on Provider Extensions. The audit reports `shared_only`, `extension_only`, and `mixed`
**operation coverage**, while worksheet rows have only the two requested task buckets. Count a mixed
operation once, and retain all its task mappings in the workbook.

The strict audit checks identities, source fingerprint, duplicate/missing records, complete
task/client coverage, supported memberships, negative search records, and bucket consistency.
`--draft` reports unfinished coverage without pretending it is final. Neither mode validates the
truth of prose or proves live API behavior. Check those from sources and independent semantic
review.

## 3. Workbook layout

Create exactly these two worksheets, with no cover sheet ahead of them and no hidden audit sheet.
Keep source/provenance notes, a small legend, and scope/version information on these sheets. The
checkpoint and ledger are analysis support, not replacement spreadsheet pages.

### First sheet: Shared Base

The table's first column is **Shared task**. Follow it with adjacent function/detail columns for
every provider, in scan order. For the current six providers:

| Columns             | Headers                                                              |
| ------------------- | -------------------------------------------------------------------- |
| A                   | Shared task                                                          |
| B–C                 | Gitea functions; Gitea mapping and description                       |
| D–E                 | Codeberg functions; Codeberg mapping and description                 |
| F–G                 | GitHub functions; GitHub mapping and description                     |
| H–I                 | GitLab functions; GitLab mapping and description                     |
| J–K                 | Bitbucket functions; Bitbucket mapping and description               |
| L–M                 | Azure DevOps functions; Azure DevOps mapping and description         |
| After all providers | Task ID; Domain; Exact common contract; Scope/version notes; Sources |

Add new providers before trailing metadata. Do not put IDs, themes, a summary chart, or a provider
name before the task column. If the user requests one column per provider instead, combine its
function and detail blocks without losing information.

### Second sheet: Provider Extensions

Use **Task / capability** in column A and the same provider function/detail columns. After the
providers, include **Providers with support**, **Overlap kind**, **Why outside shared base**, **Task
ID**, **Domain**, and **Sources**. This exposes both provider-only behavior and reusable subsets. Do
not duplicate each subset task into separate falsely unique rows for its providers.

Group/filter by overlap kind, supported providers, and domain. A task absent from Gitea still gets a
Gitea cell saying why no mapping exists in the analyzed clients. A capability that all selected
versions support but an older included version lacks belongs here under version limitations.

### Required provider-cell detail

In the function column, include a labeled block per version:

```text
<version> [DIRECT or COMPOSITE]
<ClientClass>.<exactMethodName>
<METHOD> <native route>
<source operation ID or stable inventory ID>
```

For composite mappings list every call from `steps` in execution order, including repeated methods.
For direct alternatives identify which scope/input chooses each. If several versions have the same
mapping, explicitly list all verified versions; never silently apply the selected version's method
to an older client.

The paired description column must explain:

1. The actual task outcome and why it is equivalent.
2. Native required inputs, identifier/scope mapping, body modes, and transformations or
   prerequisites.
3. Native response shape/status/media, pagination or async completion, and material output
   differences.
4. Permissions, hosting/tier/version restrictions and meaningful semantic limits.
5. Composite sequencing and its atomicity, failure and round-trip tradeoffs when relevant.
6. Specific source references, or a source ID with an unambiguous entry in the row's Sources cell.

For unsupported versions, write **ABSENT IN ANALYZED CLIENT** plus a reason, the nearest rejected
alternative if any, and source scope. No empty cells, bare dashes, or “N/A” with no explanation. Do
not use “same as Gitea” as the description for another provider.

### Usability and size

Use a restrained technical-table style: frozen task column and headers, filters, wrapped top-aligned
text, readable column widths, stable task ordering, and alternating rows if useful. Give direct,
composite, and absent statuses text labels; color can reinforce them but cannot carry meaning alone.
Do not merge body cells or merge across the filter header. Keep the task visible while scrolling
horizontally across provider columns.

Long mappings must remain readable and complete. Split overlong cells into labeled continuation rows
with the same task ID and explicit version/part labels; distinguish continuation rows from distinct
tasks when counting. Do not truncate to fit a cell or shrink the font until it is unreadable. Keep
full input/output/constraint descriptions in the workbook, not just the JSON ledger.

Write source-derived text as text, not spreadsheet formulas. Keep version strings and operation IDs
as text. If summary counts or ratios are added, use auditable formulas over explicit data/status
columns, or clearly labeled sourced audit inputs. Avoid formulas that parse meaning from prose.

## 4. Verification and delivery

Before workbook creation, run the strict ledger audit. During export, keep a task-to-sheet-row map
and an operation-to-provider-cell map in the builder's verification data. Reopen the **saved**
`.xlsx` and reconcile actual stored values, not only the in-memory builder objects:

- Both worksheet names/order are correct and there are exactly two.
- First task column and all provider blocks are present; Gitea is first.
- Every ledger task appears in its declared sheet, with the exact task ID and every client version.
- Every supported operation/task membership is in the right provider's function block.
- Every absence explanation, constraints description, and source reference survives export.
- Continuations retain full text and are not mistaken for extra tasks or operations.
- No blanks conceal unknowns; no truncation or formula errors.

Render each sheet in bounded viewports: first provider columns, middle providers, far-right
providers, longest row/continuations, version differences, subset-only rows, provider-only rows,
composite rows, and representative absent cells. Inspect the rendered images and fix clipping,
unreadable wrapping, missing text, or excessive sizing. A giant whole-sheet thumbnail is not
adequate visual QA.

Report coverage using distinct operation IDs and the current inventory fingerprint, never the number
of populated spreadsheet cells. Deliver the single final workbook. State any remaining evidence
uncertainty explicitly; if anything is unresolved, label it partial and preserve the exact resume
point rather than claiming exhaustive completion.
