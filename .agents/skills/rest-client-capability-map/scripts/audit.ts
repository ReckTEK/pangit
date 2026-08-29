/** Structural closure checks only: semantic equivalence still requires evidence review. */
export interface Evidence {
  source: string;
  locator: string;
  note: string;
}
export interface Comparison {
  clientId: string;
  status: "direct" | "composite" | "absent" | "unknown";
  operationIds: string[];
  description: string;
  inputMapping: string;
  outputMapping: string;
  constraints: string;
  evidence: Evidence[];
  steps?: Array<{ operationId: string; description: string }>;
  search?: { terms: string[]; candidateOperationIds: string[]; reason: string };
}
export interface Task {
  id: string;
  title: string;
  domain: string;
  intent: string;
  bucket: "shared" | "extension";
  comparisons: Comparison[];
}
export interface Review {
  operationId: string;
  taskIds: string[];
  reviewed: boolean;
  residualReview: string;
}
export interface Ledger {
  schemaVersion: 1;
  sourceFingerprint: string;
  tasks: Task[];
  operationReviews: Review[];
}
export interface AuditResult {
  valid: boolean;
  finalReady: boolean;
  draft: boolean;
  caveat: string;
  sourceFingerprint: string;
  providers: number;
  clients: number;
  tasks: {
    total: number;
    shared: number;
    extension: number;
    provider_only: number;
    shared_subset: number;
    version_limited: number;
  };
  operations: {
    total: number;
    reviewed: number;
    unreviewed: number;
    shared_only: number;
    extension_only: number;
    mixed: number;
    unmapped: number;
  };
  decisions: { done: number; expected: number };
  errors: string[];
  pending: string[];
}

type RecordValue = Record<string, unknown>;
const isSupported = (status: unknown) => status === "direct" || status === "composite";

/** Draft permits unfinished records, never malformed or contradictory assertions. */
export function audit(
  inventoryInput: unknown,
  ledgerInput: unknown,
  { draft = false }: { draft?: boolean } = {},
): AuditResult {
  const errors: string[] = [];
  const pending: string[] = [];
  const object = (value: unknown, at: string): RecordValue => {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      return value as RecordValue;
    }
    errors.push(`${at}: expected object`);
    return {};
  };
  const array = (value: unknown, at: string): unknown[] => {
    if (Array.isArray(value)) return value;
    errors.push(`${at}: expected array`);
    return [];
  };
  const string = (value: unknown, at: string, required = true): string => {
    if (typeof value === "string" && (!required || value.trim().length > 0)) return value;
    errors.push(`${at}: expected ${required ? "nonempty " : ""}string`);
    return "";
  };
  const strings = (value: unknown, at: string, required = false): string[] => {
    const result = array(value, at).map((item, i) => string(item, `${at}[${i}]`));
    if (required && result.length === 0) errors.push(`${at}: must not be empty`);
    if (new Set(result).size !== result.length) errors.push(`${at}: duplicate entries`);
    return result;
  };
  const records = (value: unknown, at: string) =>
    array(value, at).map((item, i) => object(item, `${at}[${i}]`));
  const index = (rows: RecordValue[], field: string, at: string) => {
    const result = new Map<string, RecordValue>();
    for (const [i, row] of rows.entries()) {
      const id = string(row[field], `${at}[${i}].${field}`);
      if (result.has(id)) errors.push(`${at}: duplicate ${field} ${id}`);
      else result.set(id, row);
    }
    return result;
  };
  const inventory = object(inventoryInput, "inventory");
  const ledger = object(ledgerInput, "ledger");
  for (const [name, value] of [["inventory", inventory], ["ledger", ledger]] as const) {
    if (value.schemaVersion !== 1) errors.push(`${name}.schemaVersion: expected 1`);
  }
  const fingerprint = string(inventory.sourceFingerprint, "inventory.sourceFingerprint");
  if (string(ledger.sourceFingerprint, "ledger.sourceFingerprint") !== fingerprint) {
    errors.push("ledger.sourceFingerprint: stale inventory; rebuild and re-review changed sources");
  }
  const providers = index(records(inventory.providers, "providers"), "id", "providers");
  const clients = index(records(inventory.clients, "clients"), "id", "clients");
  const operations = index(records(inventory.operations, "operations"), "id", "operations");
  for (
    const [name, values] of [["providers", providers], ["clients", clients], [
      "operations",
      operations,
    ]] as const
  ) {
    if (values.size === 0) errors.push(`inventory.${name}: must not be empty`);
  }
  for (const [id, client] of clients) {
    const provider = string(client.provider, `client ${id}.provider`);
    const version = string(client.version, `client ${id}.version`);
    if (!providers.has(provider)) errors.push(`client ${id}: unknown provider ${provider}`);
    if (id !== `${provider}@${version}`) errors.push(`client ${id}: inconsistent identity`);
    if (!Number.isInteger(client.operationCount) || (client.operationCount as number) < 0) {
      errors.push(`client ${id}.operationCount: expected nonnegative integer`);
    }
  }
  for (const provider of providers.keys()) {
    if (![...clients.values()].some((client) => client.provider === provider)) {
      errors.push(`provider ${provider}: has no inventoried client`);
    }
  }
  const operationCounts = new Map<string, number>();
  for (const [id, operation] of operations) {
    const clientId = string(operation.clientId, `operation ${id}.clientId`);
    const key = string(operation.operationKey, `operation ${id}.operationKey`);
    string(operation.methodName, `operation ${id}.methodName`);
    const client = clients.get(clientId);
    if (!client) errors.push(`operation ${id}: unknown client ${clientId}`);
    else if (operation.provider !== client.provider || operation.version !== client.version) {
      errors.push(`operation ${id}: provider/version disagrees with its client`);
    }
    if (id !== `${clientId}::${key}`) errors.push(`operation ${id}: inconsistent identity`);
    operationCounts.set(clientId, (operationCounts.get(clientId) ?? 0) + 1);
  }
  for (const [id, client] of clients) {
    if (client.operationCount !== (operationCounts.get(id) ?? 0)) {
      errors.push(`client ${id}.operationCount: disagrees with inventory operations`);
    }
  }
  const tasks = index(records(ledger.tasks, "tasks"), "id", "tasks");
  const reviews = index(
    records(ledger.operationReviews, "operationReviews"),
    "operationId",
    "reviews",
  );
  const memberships = new Map<string, Set<string>>();
  const taskCounts = {
    total: tasks.size,
    shared: 0,
    extension: 0,
    provider_only: 0,
    shared_subset: 0,
    version_limited: 0,
  };
  let decisionsDone = 0;
  const checkOperation = (id: string, clientId: string, at: string) => {
    const operation = operations.get(id);
    if (!operation) errors.push(`${at}: unknown operation ${id}`);
    else if (operation.clientId !== clientId) {
      errors.push(`${at}: operation ${id} belongs to another client`);
    }
  };
  for (const [taskId, task] of tasks) {
    const at = `task ${taskId}`;
    for (const field of ["title", "domain", "intent"]) string(task[field], `${at}.${field}`);
    if (task.bucket === "shared" || task.bucket === "extension") taskCounts[task.bucket]++;
    else errors.push(`${at}.bucket: expected shared or extension`);
    const comparisons = new Map<string, unknown>();
    const matchedClients = new Set<string>();
    for (const comparison of records(task.comparisons, `${at}.comparisons`)) {
      const before = errors.length;
      const clientId = string(comparison.clientId, `${at}.clientId`);
      const where = `${at} / ${clientId}`;
      if (!clients.has(clientId)) errors.push(`${where}: unknown client`);
      if (comparisons.has(clientId)) errors.push(`${where}: duplicate comparison`);
      comparisons.set(clientId, comparison.status);
      const status = comparison.status;
      if (!["direct", "composite", "absent", "unknown"].includes(status as string)) {
        errors.push(`${where}: invalid status`);
      }
      const supported = isSupported(status);
      const ids = strings(comparison.operationIds, `${where}.operationIds`, supported);
      if (comparison.steps !== undefined || status === "composite") {
        const steps = records(comparison.steps, `${where}.steps`);
        const stepIds = steps.map((step, i) => {
          const at = `${where}.steps[${i}]`;
          const id = string(step.operationId, `${at}.operationId`);
          string(step.description, `${at}.description`);
          checkOperation(id, clientId, at);
          return id;
        });
        if (status === "composite") {
          if (steps.length < 2) {
            errors.push(`${where}: composite requires at least two ordered steps`);
          }
          const uniqueStepIds = [...new Set(stepIds)];
          if (ids.length !== uniqueStepIds.length || ids.some((id, i) => id !== uniqueStepIds[i])) {
            errors.push(`${where}: operationIds must equal step membership in order of first use`);
          }
        } else if (steps.length > 0) {
          errors.push(`${where}: only composite comparisons may have nonempty steps`);
        }
      }
      if (status === "absent" && ids.length) errors.push(`${where}: absent cannot map operations`);
      for (const id of ids) {
        checkOperation(id, clientId, where);
        if (supported && operations.get(id)?.clientId === clientId && clients.has(clientId)) {
          if (!memberships.has(id)) memberships.set(id, new Set());
          memberships.get(id)!.add(taskId);
        }
      }
      for (const field of ["description", "inputMapping", "outputMapping", "constraints"]) {
        string(
          comparison[field],
          `${where}.${field}`,
          supported || status === "absent",
        );
      }
      const evidence = records(comparison.evidence, `${where}.evidence`);
      if ((supported || status === "absent") && evidence.length === 0) {
        errors.push(`${where}: evidence is required for supported or absent decisions`);
      }
      for (const item of evidence) {
        for (const field of ["source", "locator", "note"]) {
          string(item[field], `${where}.evidence.${field}`);
        }
      }
      if (comparison.search !== undefined || status === "absent") {
        const search = object(comparison.search, `${where}.search`);
        strings(search.terms, `${where}.search.terms`, true);
        string(search.reason, `${where}.search.reason`);
        for (
          const id of strings(search.candidateOperationIds, `${where}.search.candidateOperationIds`)
        ) {
          checkOperation(id, clientId, `${where}.search`);
        }
      }
      if (status === "unknown") pending.push(`${where}: comparison is unknown`);
      if (supported && clients.has(clientId)) matchedClients.add(clientId);
      if (errors.length === before && status !== "unknown") decisionsDone++;
    }
    for (const clientId of clients.keys()) {
      if (!comparisons.has(clientId)) pending.push(`${at} / ${clientId}: missing comparison`);
    }
    const resolved = [...clients.keys()].every((id) =>
      isSupported(comparisons.get(id)) || comparisons.get(id) === "absent"
    );
    if (task.bucket === "shared" && [...comparisons.values()].includes("absent")) {
      errors.push(`${at}: shared bucket conflicts with an absent client`);
    }
    if (task.bucket === "extension" && resolved) {
      if (matchedClients.size === 0 || matchedClients.size === clients.size) {
        errors.push(`${at}: extension requires at least one matched and one absent client`);
      } else {
        const providerCount = new Set([...matchedClients].map((id) =>
          clients.get(id)!.provider
        )).size;
        const kind = providerCount === 1
          ? "provider_only"
          : providerCount < providers.size
          ? "shared_subset"
          : "version_limited";
        taskCounts[kind]++;
      }
    }
  }
  let reviewed = 0;
  for (const [operationId, review] of reviews) {
    const at = `review ${operationId}`;
    if (!operations.has(operationId)) errors.push(`${at}: unknown operation`);
    if (typeof review.reviewed !== "boolean") errors.push(`${at}.reviewed: expected boolean`);
    const taskIds = strings(review.taskIds, `${at}.taskIds`, review.reviewed === true);
    string(review.residualReview, `${at}.residualReview`, review.reviewed === true);
    for (const taskId of taskIds) {
      if (!tasks.has(taskId)) errors.push(`${at}: unknown task ${taskId}`);
    }
    const actual = memberships.get(operationId) ?? new Set<string>();
    if (taskIds.length !== actual.size || taskIds.some((taskId) => !actual.has(taskId))) {
      errors.push(`${at}: taskIds must equal supported task memberships`);
    }
    if (review.reviewed === true && operations.has(operationId)) reviewed++;
    else if (operations.has(operationId)) pending.push(`${at}: operation has not been reviewed`);
  }
  const bucketCounts = { shared_only: 0, extension_only: 0, mixed: 0, unmapped: 0 };
  for (const operationId of operations.keys()) {
    if (!reviews.has(operationId)) pending.push(`operation ${operationId}: missing review`);
    const mapped = memberships.get(operationId) ?? new Set<string>();
    if (mapped.size === 0) {
      bucketCounts.unmapped++;
      pending.push(`operation ${operationId}: has no supported task mapping`);
    } else {
      const buckets = new Set([...mapped].map((id) => tasks.get(id)!.bucket));
      if (buckets.has("shared") && buckets.has("extension")) bucketCounts.mixed++;
      else if (buckets.has("shared")) bucketCounts.shared_only++;
      else if (buckets.has("extension")) bucketCounts.extension_only++;
    }
  }
  return {
    valid: errors.length === 0,
    finalReady: errors.length === 0 && pending.length === 0,
    draft,
    caveat:
      "Structural closure only; equivalence, evidence accuracy, and residual completeness require semantic review.",
    sourceFingerprint: fingerprint,
    providers: providers.size,
    clients: clients.size,
    tasks: taskCounts,
    operations: {
      total: operations.size,
      reviewed,
      unreviewed: operations.size - reviewed,
      ...bucketCounts,
    },
    decisions: { done: decisionsDone, expected: tasks.size * clients.size },
    errors,
    pending,
  };
}

if (import.meta.main) {
  try {
    const args = [...Deno.args];
    let inventoryPath: string | undefined;
    let ledgerPath: string | undefined;
    let draft = false;
    while (args.length) {
      const arg = args.shift();
      if (arg === "--draft" && !draft) draft = true;
      else if ((arg === "--inventory" && !inventoryPath) || (arg === "--ledger" && !ledgerPath)) {
        const path = args.shift();
        if (!path || path.startsWith("--")) throw new Error(`Missing path after ${arg}`);
        if (arg === "--inventory") inventoryPath = path;
        else ledgerPath = path;
      } else throw new Error(`Unknown or duplicate argument: ${arg}`);
    }
    if (!inventoryPath || !ledgerPath) {
      throw new Error(
        "Usage: audit.ts --inventory <inventory.json> --ledger <ledger.json> [--draft]",
      );
    }
    const result = audit(
      JSON.parse(await Deno.readTextFile(inventoryPath)),
      JSON.parse(await Deno.readTextFile(ledgerPath)),
      { draft },
    );
    const limit = 40;
    console.log(JSON.stringify({
      ...result,
      diagnostics: {
        errorCount: result.errors.length,
        pendingCount: result.pending.length,
        limit,
        truncated: result.errors.length > limit || result.pending.length > limit,
      },
      errors: result.errors.slice(0, limit),
      pending: result.pending.slice(0, limit),
    }));
    if (!result.valid || (!draft && !result.finalReady)) Deno.exit(1);
  } catch (error) {
    console.log(JSON.stringify({ valid: false, finalReady: false, errors: [String(error)] }));
    Deno.exit(1);
  }
}
