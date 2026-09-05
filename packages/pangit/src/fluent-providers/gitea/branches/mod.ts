export { getGiteaBranch, giteaBranchExists, listGiteaBranches } from "./read-branches.ts";

export { createGiteaBranch, deleteGiteaBranch, renameGiteaBranch } from "./mutate-branches.ts";

export { getGiteaBranchDivergence, listGiteaBranchDivergences } from "./divergence.ts";

export { normalizeGiteaBranch } from "./normalize-branch.ts";
export { createOperations } from "./adapter.ts";
