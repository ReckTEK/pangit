import type { DocumentationOperation } from "./documentation/model.ts";

export interface ExplorerSpec {
  openapi: string;
  paths: Record<string, Record<string, unknown>>;
  servers?: { url: string; [key: string]: unknown }[];
  "x-ms-paths"?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

/** Adapt only the in-memory explorer view. The downloadable provider document is untouched. */
export function explorerSpec(
  source: ExplorerSpec,
  variant?: { method: string; path: string },
  operations: readonly DocumentationOperation[] = [],
): ExplorerSpec {
  const spec = structuredClone(source);
  // Stable, URL-safe method IDs make links work even for absent, duplicate, or slash-containing
  // upstream operation IDs. Keep the native ID visible and never alter the downloadable spec.
  for (const operation of operations) {
    const item = spec[operation.source.collection]?.[operation.source.path];
    const raw = item?.[operation.method.toLowerCase()] as Record<string, unknown> | undefined;
    if (!raw) throw new Error(`Missing explorer operation ${operation.methodName}`);
    if (raw.operationId) raw["x-pangit-upstream-operation-id"] = raw.operationId;
    raw.operationId = operation.methodName;
    raw.tags = operation.tags.length ? operation.tags : ["default"];
    raw.description = `${
      raw.description ?? ""
    }\n\n**PanGit method:** \`${operation.methodName}()\`${
      raw["x-pangit-upstream-operation-id"]
        ? `\n\n**Upstream operation ID:** \`${raw["x-pangit-upstream-operation-id"]}\``
        : ""
    }`;
  }
  if (variant) {
    const item = spec["x-ms-paths"]?.[variant.path];
    if (!item?.[variant.method]) {
      throw new Error("This query-selected operation is not in the spec.");
    }
    spec.paths = {
      [variant.path.split("?")[0]]: {
        ...(item.parameters ? { parameters: item.parameters } : {}),
        ...(item.servers ? { servers: item.servers } : {}),
        [variant.method]: item[variant.method],
      },
    };
    const operation = item[variant.method] as { tags?: string[] };
    if (Array.isArray(spec.tags)) {
      spec.tags = spec.tags.filter((tag: { name: string }) => operation.tags?.includes(tag.name));
    }
  }
  const adaptServers = (object: Record<string, unknown>) => {
    const servers = Array.isArray(object.servers)
      ? object.servers.map((server: { url: string }) => ({
        ...server,
        url: server.url.startsWith("//") ? `https:${server.url}` : server.url,
      }))
      : [];
    // Scalar's embedded client edits declared server variables, not arbitrary server definitions.
    const custom = {
      url: "{apiServer}",
      description: "Custom API server",
      variables: {
        apiServer: {
          default: "",
          description: "Complete API base URL, including any API prefix such as /api/v1.",
        },
      },
    };
    object.servers = !servers.length || servers[0].url.startsWith("/")
      ? [custom, ...servers]
      : [...servers, custom];
  };
  adaptServers(spec);
  for (const item of Object.values(spec.paths)) {
    if (item.servers) adaptServers(item);
    for (const method of ["get", "post", "put", "patch", "delete", "head", "options", "trace"]) {
      const operation = item[method];
      if (operation && typeof operation === "object" && "servers" in operation) {
        adaptServers(operation as Record<string, unknown>);
      }
    }
  }
  return spec;
}
