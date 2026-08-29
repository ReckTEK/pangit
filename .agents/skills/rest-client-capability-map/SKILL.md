---
name: rest-client-capability-map
description: Build an exhaustive two-sheet spreadsheet comparing the semantic capabilities of every PanGit raw REST provider and client version. Start with Gitea, map equivalent tasks despite different method names, distinguish the universal shared base from subset-shared and provider-only extensions, and reconcile every operation against schemas and generated clients. Use for REST capability inventories, provider parity analysis, and shared-versus-unique API maps in this project.
---

# REST Client Capability Map

Produce a detailed `.xlsx` with **exactly two worksheets**, in this order:

1. **Shared Base** — one precisely defined shared task per row, first column; Gitea first among the
   provider columns, followed by every other provider's exact methods and detailed mapping.
2. **Provider Extensions** — the same comparison layout for everything outside the universal base.
   Identify capabilities shared by a subset, capabilities present only in one provider, and version
   differences. “Not common to all” does **not** mean “unique to one.”

This is a semantic analysis of the raw clients, not an implementation of a normalized API. Do not
modify clients, schemas, generators, public names, or tests to make providers match. A request to
create or edit this skill does not also request the workbook.

## Scope and evidence

Work from this module's root, identified by `codegen/specs/providers.json` and `packages/pangit/`.
Use **all configured providers and all their client versions** unless the user explicitly narrows
the scope. The default shared base must work in every included client version, not merely one
release per provider. Count distinct providers separately from versioned clients.

Read [the project source guide](references/project-sources.md) before inventorying. Use normalized
schemas for meaning, generated clients for the callable surface, and the raw manifest/specifications
for provenance and normalization questions. No single source replaces the others' responsibilities.
`latest` means a checked-in snapshot, not a claim about a currently deployed service.

Use local sources first. Consult version-matched official provider documentation when the local
contract cannot establish a mapping; save the citation and distinguish inference from documented
behavior. Live API execution, Docker, and regeneration are not required for this analysis.

## 1. Freeze and reconcile the inventory

Use a fresh run directory outside generated source trees. The examples below use
`/tmp/rest-map-run`; choose an unused run directory or resume the user's existing one. Run from the
module root:

```bash
deno run --allow-read --allow-write .agents/skills/rest-client-capability-map/scripts/inventory.ts --out /tmp/rest-map-run/inventory.json
```

The helper reads every provider/version, preserves original operation identity, resolves public
names with the real generator, and cross-checks schemas against generated registries and methods. It
never calls provider APIs. Its fingerprint binds the inventory to the exact source files.

Inspect the totals and the source boundaries before proceeding. A missing or extra client,
operation, or schema is a reconciliation issue, not an operation to silently exclude. Diagnose it
without regenerating the project. Do not treat successful extraction as completed semantic analysis.

## 2. Walk Gitea first, then every provider

Read [the detailed comparison procedure](references/comparison-procedure.md). Follow this sequence:

1. Start with the **selected Gitea version**. Walk every operation in stable inventory order, in
   small batches that allow complete schema reading. Describe its actual task, inspect its material
   input variants and outputs, and search every other provider/version for semantic equivalents.
2. Walk every other Gitea version. Reuse evidence only after checking its contract; add removed,
   added, or changed tasks and version limitations. Older releases remain part of the denominator.
3. Continue through **Codeberg, GitHub, GitLab, Bitbucket, Azure DevOps**, then any newly configured
   providers in stable order. Walk **every operation**, including already matched ones. This reverse
   pass catches capabilities that Gitea does not have and richer behavior hidden by early matches.
4. Whenever a provider adds or changes a task definition, compare that task against **all clients
   again**, including Gitea and providers already visited. Update earlier decisions when necessary.
5. Repeat residual and cross-provider passes until every operation is reviewed, every task has a
   decision for every client, every material capability is assigned, and no unresolved decisions
   remain. Finishing Gitea, exhausting name matches, or completing one pass is not completion.

Search names, tags, paths, summaries, descriptions, referenced schemas, and related operation
families. Names only find candidates; task outcome, scope, inputs, outputs, and preconditions decide
equivalence. Read every plausible candidate before accepting or rejecting it.

## 3. Record decisions as work proceeds

Read [the ledger and workbook contract](references/ledger-and-workbook.md) before recording the
first batch. Keep these files in the run directory:

- `inventory.json`: immutable source snapshot from the helper.
- `ledger.json`: task definitions, one comparison per task/client, and one review per operation.
- `checkpoint.json`: current phase, provider/version, next operation, open questions, and tasks
  needing re-comparison, using the checkpoint contract in the reference. Derive the next operation
  from the earliest unreviewed inventory entry, not the entry after the last examined candidate.

Use stable operation IDs, exact case-sensitive public method names, source pointers, and explicit
version labels. Save after each bounded batch. Missing evidence stays `unknown`; it cannot be
converted to an absence or a “unique” claim to close the ledger.

Hash any additional local evidence files, such as shared transport or normalizers, in the
checkpoint. The inventory fingerprint covers manifests, raw/normalized schemas, and generated
clients only.

Use two final task buckets: `shared` and `extension`. A method can contribute a shared primitive and
additional extension tasks. Record all memberships and its residual review; count that operation
only once in inventory coverage. Split partial equivalence into defensible task boundaries rather
than marking the whole richer operation equivalent.

Check progress without claiming completion:

```bash
deno run --allow-read .agents/skills/rest-client-capability-map/scripts/audit.ts --inventory /tmp/rest-map-run/inventory.json --ledger /tmp/rest-map-run/ledger.json --draft
```

For parallel work, assign disjoint client/batch reviews and separate result files. Keep one owner of
canonical task definitions and the merged ledger. A new task from any worker must return to the
all-client comparison queue. Do not let workers certify uniqueness from only their assigned client.

## 4. Build the two-sheet spreadsheet

Follow the layout and cell-content contract in
[ledger and workbook](references/ledger-and-workbook.md). Keep the task in column A; put Gitea's
function and description columns first, then the other providers. Include exact callable methods,
HTTP routes, version-specific differences, input/output adaptation, restrictions, and source
evidence. Every unsupported cell needs a scoped explanation. Never leave a blank that could mean
“unchecked.”

When authoring the workbook, use the available **Spreadsheets** skill and
`load_workspace_dependencies` for its supported authoring/runtime and rendering workflow. Do not
hardcode machine-specific dependency paths in this project skill. Preserve these two worksheets and
their task/provider structure when applying formatting. If authoring tools are unavailable, preserve
the completed analysis and state the exact blocker; JSON or CSV alone is not the requested workbook.

Generate workbook cells from the ledger, not a separately rewritten interpretation. If long evidence
or descriptions require continuation rows, retain the task ID and explicit continuation labels. Do
not silently truncate details or hide them in a sidecar instead of the spreadsheet.

## 5. Prove closure and stop

Run the inventory helper again to a second file and compare fingerprints. If source inputs changed,
reconcile the new inventory and re-review affected decisions before claiming current coverage. Also
verify the checkpoint's additional evidence hashes and reopen affected tasks if they changed. Then
run the strict audit without `--draft`:

```bash
deno run --allow-read .agents/skills/rest-client-capability-map/scripts/audit.ts --inventory /tmp/rest-map-run/inventory.json --ledger /tmp/rest-map-run/ledger.json
```

Completion requires all of the following:

- Every configured provider/version is present and schema/client inventories agree.
- Every operation has a completed review and all its supported task memberships are recorded.
- Every task has an evidence-backed decision for every client; no unknowns or unreviewed residuals.
- Shared rows meet the exact task contract in every client; extension rows identify their real
  overlap.
- Negative decisions include a search trail and reasons the nearest candidates fail the task.
- Source fingerprints and additional evidence hashes still match; strict audit succeeds.
- Every ledger task and operation membership appears in the correct workbook sheet and provider
  cell.
- Both sheets have been inspected and rendered, including long mappings, absent cells, composite
  mappings, older-version differences, and the far-right provider columns. Reopen the saved workbook
  and verify content, counts, source references, and any formulas.

The audit proves structural coverage, **not semantic correctness or live provider parity**. Perform
an independent semantic check of ambiguous matches, all-provider base claims, and extension claims;
correct the underlying ledger, then regenerate and recheck the workbook.

Deliver the workbook with concise provider/client/operation coverage and any evidence limitations.
If interrupted or blocked, save the exact next step and report actual reviewed versus total counts;
do not label a partial workbook complete. Stop when the requested map is complete and verified.
