import {
  type ClientOperationDescriptor,
  describeClientOperations,
  generatedClientClassName,
} from "../generator/generate.ts";
import { compareText } from "../generator/naming.ts";
import { asString, parseOpenApiDocument } from "../generator/openapi.ts";
import {
  capabilities,
  type CapabilityMember,
  type ProviderId,
  providerIds,
  rejectedMappings,
  uniqueSurfaces,
} from "./capabilities.ts";

const normalizedSpecsDirectory = new URL("../specs/normalized/", import.meta.url);
const outputUrl = new URL("../../docs/rest-client-capability-matrix.md", import.meta.url);

const providerDisplayNames: Readonly<Record<ProviderId, string>> = {
  "azure-devops": "Azure DevOps",
  bitbucket: "Bitbucket",
  codeberg: "Codeberg",
  gitea: "Gitea",
  github: "GitHub",
  gitlab: "GitLab",
};

type ProviderData = {
  id: ProviderId;
  displayName: string;
  className: string;
  title: string;
  version: string;
  sha256: string;
  operations: readonly ClientOperationDescriptor[];
  operationByName: ReadonlyMap<string, ClientOperationDescriptor>;
};

type MethodClassification = {
  capabilities: { id: string; relation: "E" | "P" }[];
  unique: string[];
};

export async function generateRestClientCapabilityMatrix(check = false): Promise<void> {
  const providers = await loadProviders();
  validateRules(providers);
  const output = await renderDocument(providers);

  if (check) {
    const existing = await Deno.readTextFile(outputUrl);
    if (existing !== output) {
      throw new Error("docs/rest-client-capability-matrix.md is out of date; run deno task graph");
    }
    return;
  }

  await Deno.mkdir(new URL("./", outputUrl), { recursive: true });
  await Deno.writeTextFile(outputUrl, output);
  console.log(JSON.stringify({
    providers: providerIds.length,
    capabilities: capabilities.length,
    destination: "docs/rest-client-capability-matrix.md",
  }));
}

async function loadProviders(): Promise<ProviderData[]> {
  return await Promise.all(providerIds.map(async (id) => {
    const text = await Deno.readTextFile(new URL(`${id}.json`, normalizedSpecsDirectory));
    const document = parseOpenApiDocument(text, id);
    const operations = describeClientOperations(document);
    return {
      id,
      displayName: providerDisplayNames[id],
      className: generatedClientClassName(id),
      title: asString(document.info.title) ?? providerDisplayNames[id],
      version: asString(document.info.version) ?? "unspecified",
      sha256: await sha256(text),
      operations,
      operationByName: new Map(operations.map((operation) => [operation.methodName, operation])),
    };
  }));
}

function validateRules(providers: readonly ProviderData[]): void {
  const errors: string[] = [];
  const byId = new Map(providers.map((provider) => [provider.id, provider]));

  for (const capability of capabilities) {
    for (const providerId of providerIds) {
      for (const method of capability.members[providerId]?.methods ?? []) {
        if (!byId.get(providerId)?.operationByName.has(method)) {
          errors.push(`${capability.id}: ${providerId}.${method} does not exist`);
        }
      }
    }
  }
  for (const surface of uniqueSurfaces) {
    for (const method of surface.methods) {
      if (!byId.get(surface.provider)?.operationByName.has(method)) {
        errors.push(`${surface.id}: ${surface.provider}.${method} does not exist`);
      }
    }
  }
  for (const rejection of rejectedMappings) {
    for (const providerId of providerIds) {
      for (const method of rejection.methods[providerId] ?? []) {
        if (!byId.get(providerId)?.operationByName.has(method)) {
          errors.push(`${rejection.title}: ${providerId}.${method} does not exist`);
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Capability rules reference missing generated methods:\n${errors.join("\n")}`);
  }
}

async function renderDocument(providers: readonly ProviderData[]): Promise<string> {
  const classifications = buildClassifications(providers);
  const ruleHash = await sha256(JSON.stringify({ capabilities, rejectedMappings, uniqueSurfaces }));
  const sections = [
    "# Generated REST Client Capability Graph",
    "",
    "> This document compares the generated clients in this repository, not every feature offered by each hosted product. `—` means no accepted mapping in the generated snapshot, not confirmed product absence.",
    "",
    "Capability equivalence means the same user-visible intent can be adapted. It does **not** mean request or response types, authorization, side effects, pagination, or wire semantics are interchangeable.",
    "",
    "## Inputs",
    "",
    renderInputsTable(providers),
    "",
    `Reviewed rule-set SHA-256: \`${ruleHash}\``,
    "",
    "Azure `x-ms-paths` operations are included. GitHub `x-webhooks` are excluded because they describe inbound webhook deliveries rather than outbound REST client methods.",
    "",
    "## Legend",
    "",
    "| Mark | Meaning |",
    "|---|---|",
    "| `E` | Reviewed equivalent user-visible capability. Provider-specific adaptation is still required. |",
    "| `P` | Reviewed partial mapping with a material semantic, scope, composition, or specification difference. |",
    "| `N` | Tempting apparent match that is explicitly rejected. |",
    "| `U` | Reviewed provider-specific surface with no accepted common contract. |",
    "| `—` | No accepted generated mapping. |",
    "| `Unmatched` | Method is inventoried but has not been assigned to a reviewed capability or unique surface. |",
    "",
    "## Coverage",
    "",
    renderCoverageTable(providers, classifications),
    "",
    "Counts classify each method once with precedence `E`, `P`, `U`, then `Unmatched`. A method may also be cross-referenced by multiple capability rows.",
    "",
    "## Capability Equivalence Graph",
    "",
    ...renderCapabilityMatrices(providers),
    "## Explicitly Rejected Mappings",
    "",
    "These resources look similar by name but cannot share a safe common contract.",
    "",
    renderRejectedMappings(providers),
    "",
    "## Provider-Specific Surfaces",
    "",
    ...renderUniqueSections(providers),
    "## Complete Generated Method Inventory",
    "",
    "Every generated operation appears below. `Unmatched` is intentionally conservative and does not claim product uniqueness.",
    "",
    ...renderInventories(providers, classifications),
    "## Mapping Rules",
    "",
    "- Exact public generated method names are pinned by reviewed rules.",
    "- Similar names, tags, paths, or schemas never establish equivalence automatically.",
    "- `project`, `repository`, `workspace`, `organization`, and `group` aliases are applied only inside a reviewed capability.",
    "- Partial mappings always explain the material difference.",
    "- New or changed upstream methods automatically remain unmatched until reviewed.",
    "- The document contains no generation timestamp, and all ordering is ordinal for deterministic output.",
    "",
  ];
  return `${sections.join("\n").replaceAll(/\n{3,}/g, "\n\n")}\n`;
}

function renderInputsTable(providers: readonly ProviderData[]): string {
  const lines = [
    "| Client | Spec title/version | Methods | Normalized input | SHA-256 |",
    "|---|---|---:|---|---|",
  ];
  for (const provider of providers) {
    lines.push(
      `| \`${provider.className}\` | ${
        cell(`${provider.title} ${provider.version}`)
      } | ${provider.operations.length} | \`codegen/specs/normalized/${provider.id}.json\` | \`${provider.sha256}\` |`,
    );
  }
  lines.push(
    `| **Total** |  | **${
      providers.reduce((total, provider) => total + provider.operations.length, 0)
    }** |  |  |`,
  );
  return lines.join("\n");
}

function renderCoverageTable(
  providers: readonly ProviderData[],
  classifications: ReadonlyMap<ProviderId, ReadonlyMap<string, MethodClassification>>,
): string {
  const lines = [
    `| Classification | ${providers.map((provider) => provider.displayName).join(" | ")} |`,
    `|---|${providers.map(() => "---:").join("|")}|`,
  ];
  for (const classification of ["Equivalent", "Partial", "Verified unique", "Unmatched"] as const) {
    const values = providers.map((provider) => {
      const methods = classifications.get(provider.id)!;
      return [...methods.values()].filter((value) =>
        primaryClassification(value) === classification
      ).length;
    });
    lines.push(`| ${classification} | ${values.join(" | ")} |`);
  }
  lines.push(
    `| **Total** | ${
      providers.map((provider) => `**${provider.operations.length}**`).join(" | ")
    } |`,
  );
  return lines.join("\n");
}

function renderCapabilityMatrices(providers: readonly ProviderData[]): string[] {
  const domains = [...new Set(capabilities.map((capability) => capability.domain))].toSorted(
    compareText,
  );
  const sections: string[] = [];
  for (const domain of domains) {
    sections.push(`### ${domain}`, "");
    sections.push(
      `| Capability | Mapping contract | ${
        providers.map((provider) => provider.displayName).join(" | ")
      } |`,
      `|---|---|${providers.map(() => "---").join("|")}|`,
    );
    for (
      const capability of capabilities.filter((item) => item.domain === domain).toSorted((
        left,
        right,
      ) => compareText(left.id, right.id))
    ) {
      const providerCells = providers.map((provider) =>
        renderCapabilityCell(provider, capability.members[provider.id])
      );
      sections.push(
        `| **${cell(capability.title)}**<br>\`${capability.id}\` | ${
          cell(capability.contract)
        }<br><sub>${cell(capability.mapping)}</sub> | ${providerCells.join(" | ")} |`,
      );
    }
    sections.push("");
  }
  return sections;
}

function renderCapabilityCell(
  provider: ProviderData,
  member: CapabilityMember | undefined,
): string {
  if (member === undefined) return "—";
  const methods = member.methods.map((method) => `\`${provider.className}.${method}\``).join(
    "<br>",
  );
  const note = member.note === undefined ? "" : `<br><sub>${cell(member.note)}</sub>`;
  return `**${member.relation}**<br>${methods}${note}`;
}

function renderRejectedMappings(providers: readonly ProviderData[]): string {
  const lines = [
    `| Apparent match | ${
      providers.map((provider) => provider.displayName).join(" | ")
    } | Why mapping is rejected |`,
    `|---|${providers.map(() => "---").join("|")}|---|`,
  ];
  for (
    const rejection of rejectedMappings.toSorted((left, right) =>
      compareText(left.title, right.title)
    )
  ) {
    const methods = providers.map((provider) => {
      const names = rejection.methods[provider.id];
      return names === undefined
        ? "—"
        : names.map((method) => `\`${provider.className}.${method}\``).join("<br>");
    });
    lines.push(
      `| **N: ${cell(rejection.title)}** | ${methods.join(" | ")} | ${cell(rejection.reason)} |`,
    );
  }
  return lines.join("\n");
}

function renderUniqueSections(providers: readonly ProviderData[]): string[] {
  const sections: string[] = [];
  for (const provider of providers) {
    sections.push(`### ${provider.displayName}`, "");
    const surfaces = uniqueSurfaces.filter((surface) => surface.provider === provider.id)
      .toSorted((left, right) => compareText(left.id, right.id));
    for (const surface of surfaces) {
      sections.push(`#### ${surface.title}`, "", surface.description, "");
      sections.push(
        `Methods: ${
          surface.methods.map((method) => `\`${provider.className}.${method}\``).join(", ")
        }.`,
        "",
      );
      if (surface.nearest !== undefined) {
        sections.push(`**Why it remains provider-specific:** ${surface.nearest}`, "");
      }
    }
    const unmatched = provider.operations.length - new Set([
      ...capabilities.flatMap((capability) => capability.members[provider.id]?.methods ?? []),
      ...surfaces.flatMap((surface) => surface.methods),
    ]).size;
    sections.push(
      `The exhaustive inventory contains ${
        Math.max(0, unmatched)
      } additional unmatched ${provider.displayName} methods. They are not called unique until a semantic review confirms that classification.`,
      "",
    );
  }
  return sections;
}

function renderInventories(
  providers: readonly ProviderData[],
  classifications: ReadonlyMap<ProviderId, ReadonlyMap<string, MethodClassification>>,
): string[] {
  const sections: string[] = [];
  for (const provider of providers) {
    sections.push(`### ${provider.displayName}: ${provider.operations.length} methods`, "");
    const byTag = new Map<string, ClientOperationDescriptor[]>();
    for (const operation of provider.operations) {
      const tag = operation.tags[0] ?? "untagged";
      byTag.set(tag, [...(byTag.get(tag) ?? []), operation]);
    }
    for (
      const [tag, operations] of [...byTag.entries()].toSorted(([left], [right]) =>
        compareText(left, right)
      )
    ) {
      sections.push(
        `<details>`,
        `<summary><strong>${cell(tag)}</strong> (${operations.length})</summary>`,
        "",
      );
      sections.push(
        "| Method | HTTP | Route | Classification | Description |",
        "|---|---|---|---|---|",
      );
      for (
        const operation of operations.toSorted((left, right) =>
          compareText(left.methodName, right.methodName)
        )
      ) {
        const classification = classifications.get(provider.id)!.get(operation.methodName)!;
        sections.push(
          `| \`${provider.className}.${operation.methodName}\` | \`${operation.method}\` | \`${
            cell(operation.path)
          }\` | ${renderClassification(classification)} | ${cell(conciseDescription(operation))} |`,
        );
      }
      sections.push("", "</details>", "");
    }
  }
  return sections;
}

function buildClassifications(
  providers: readonly ProviderData[],
): ReadonlyMap<ProviderId, ReadonlyMap<string, MethodClassification>> {
  const result = new Map<ProviderId, Map<string, MethodClassification>>();
  for (const provider of providers) {
    result.set(
      provider.id,
      new Map(
        provider.operations.map((
          operation,
        ) => [operation.methodName, { capabilities: [], unique: [] }]),
      ),
    );
  }
  for (const capability of capabilities) {
    for (const providerId of providerIds) {
      const member = capability.members[providerId];
      for (const method of member?.methods ?? []) {
        result.get(providerId)!.get(method)!.capabilities.push({
          id: capability.id,
          relation: member!.relation,
        });
      }
    }
  }
  for (const surface of uniqueSurfaces) {
    for (const method of surface.methods) {
      result.get(surface.provider)!.get(method)!.unique.push(surface.id);
    }
  }
  for (const methods of result.values()) {
    for (const classification of methods.values()) {
      classification.capabilities.sort((left, right) => compareText(left.id, right.id));
      classification.unique.sort(compareText);
    }
  }
  return result;
}

function primaryClassification(
  classification: MethodClassification,
): "Equivalent" | "Partial" | "Verified unique" | "Unmatched" {
  if (classification.capabilities.some((mapping) => mapping.relation === "E")) return "Equivalent";
  if (classification.capabilities.some((mapping) => mapping.relation === "P")) return "Partial";
  if (classification.unique.length > 0) return "Verified unique";
  return "Unmatched";
}

function renderClassification(classification: MethodClassification): string {
  const mappings = classification.capabilities.map((mapping) =>
    `\`${mapping.relation}:${mapping.id}\``
  );
  const unique = classification.unique.map((id) => `\`U:${id}\``);
  return [...mappings, ...unique].join("<br>") || "Unmatched";
}

function conciseDescription(operation: ClientOperationDescriptor): string {
  const source = operation.summary ?? operation.description ?? operation.operationId;
  const normalized = source.replaceAll(/\s+/g, " ").trim();
  const maximumLength = 240;
  const description = normalized.length <= maximumLength
    ? normalized
    : `${normalized.slice(0, maximumLength - 1).trimEnd()}…`;
  return operation.deprecated ? `[Deprecated] ${description}` : description;
}

function cell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", "<br>");
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

if (import.meta.main) {
  await generateRestClientCapabilityMatrix(Deno.args.includes("--check"));
}
