import { giteaContractCatalog, selectGiteaContracts } from "./gitea-contract-catalog.ts";
import { giteaFluentContractIds } from "./gitea-contract-ids.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("Gitea contract catalog has stable unique IDs in declared order", () => {
  const ids = giteaContractCatalog.map((contract) => contract.id);
  assert(
    JSON.stringify(ids) === JSON.stringify(giteaFluentContractIds),
    "Gitea contract implementation order differs from its stable ID catalog",
  );
  assert(new Set(ids).size === ids.length, "Gitea contract IDs are not unique");
  assert(
    ids.every((id) =>
      /^(?:core|foundation|shared-capability|gitea-extension|native-access)(?:\/[a-z0-9-]+)+$/.test(
        id,
      )
    ),
    "Gitea contract catalog contains an invalid stable ID",
  );
});

Deno.test("Gitea contract selection returns one exact entry and rejects unknown IDs", () => {
  const selected = selectGiteaContracts("core/repositories");
  assert(selected.length === 1, "Focused contract selection returned more than one entry");
  assert(selected[0].id === "core/repositories", "Focused selection returned wrong entry");

  let rejected = false;
  try {
    selectGiteaContracts("core/not-real");
  } catch (error) {
    rejected = error instanceof TypeError;
  }
  assert(rejected, "Unknown Gitea contract ID was accepted");
});
