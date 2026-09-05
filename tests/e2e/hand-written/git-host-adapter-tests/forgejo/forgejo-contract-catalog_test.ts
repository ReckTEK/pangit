import { forgejoContractCatalog, selectForgejoContracts } from "./forgejo-contract-catalog.ts";
import { forgejoFluentContractIds } from "./forgejo-contract-ids.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("Forgejo contract catalog has stable unique IDs in declared order", () => {
  const ids = forgejoContractCatalog.map((contract) => contract.id);
  assert(
    JSON.stringify(ids) === JSON.stringify(forgejoFluentContractIds),
    "Forgejo contract implementation order differs from its stable ID catalog",
  );
  assert(new Set(ids).size === ids.length, "Forgejo contract IDs are not unique");
  assert(
    ids.every((id) =>
      /^(?:core|foundation|shared-capability|forgejo-extension|native-access)(?:\/[a-z0-9-]+)+$/
        .test(
          id,
        )
    ),
    "Forgejo contract catalog contains an invalid stable ID",
  );
});

Deno.test("Forgejo contract selection returns one exact entry and rejects unknown IDs", () => {
  const selected = selectForgejoContracts("core/repositories");
  assert(selected.length === 1, "Focused contract selection returned more than one entry");
  assert(selected[0].id === "core/repositories", "Focused selection returned wrong entry");

  let rejected = false;
  try {
    selectForgejoContracts("core/not-real");
  } catch (error) {
    rejected = error instanceof TypeError;
  }
  assert(rejected, "Unknown Forgejo contract ID was accepted");
});
