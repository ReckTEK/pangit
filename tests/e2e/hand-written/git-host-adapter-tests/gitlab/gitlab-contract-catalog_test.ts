import { gitlabContractCatalog, selectGitLabContracts } from "./gitlab-contract-catalog.ts";
import { gitlabFluentContractIds } from "./gitlab-contract-ids.ts";
Deno.test("GitLab fluent catalog matches every independently selectable contract", () => {
  const actual = gitlabContractCatalog.map((c) => c.id);
  if (JSON.stringify(actual) !== JSON.stringify(gitlabFluentContractIds)) {
    throw new Error("Contract catalog drift");
  }
  if (new Set(actual).size !== actual.length) throw new Error("Duplicate contract ID");
  for (const id of actual) {
    if (selectGitLabContracts(id).length !== 1) throw new Error("Invalid selection");
  }
  try {
    selectGitLabContracts("missing");
  } catch (e) {
    if (e instanceof TypeError) return;
    throw e;
  }
  throw new Error("Unknown contract must be rejected");
});
