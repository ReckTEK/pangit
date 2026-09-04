import { generatedComment } from "../../generated-notices.ts";
import { workspace, type WorkspacePaths } from "../../workspace-layout.ts";
import { sha256 } from "../raw-rest-client-generation/openapi-specifications/download-openapi-specifications.ts";

/** Reviewed upstream inputs; upgrades require updating both version and content hashes. */
export const mediaTypeSource = {
  version: "1.54.0",
  database: {
    source: "https://raw.githubusercontent.com/jshttp/mime-db/v1.54.0/db.json",
    destination: "codegen/pangit/media-type-generation/downloaded/mime-db.json",
    sha256: "sha256:96b8a5746867c832ab56743c05e46e73c9facb04879677df0b356f20496cb6cd",
  },
  license: {
    source: "https://raw.githubusercontent.com/jshttp/mime-db/v1.54.0/LICENSE",
    destination: "codegen/pangit/media-type-generation/downloaded/LICENSE.txt",
    sha256: "sha256:cc1dfd4dafa27271e8212cd3b274eeb3f262e40a6fdab36ddc3f9696f706f58b",
  },
} as const;

type MediaTypeEntry = {
  source?: "iana" | "apache" | "nginx";
  extensions?: string[];
};

export type MediaTypeDatabase = Record<string, MediaTypeEntry>;

/** Resolve collisions with the established mime-db consumers' source preference. */
export function createExtensionMap(database: MediaTypeDatabase): Readonly<Record<string, string>> {
  // Same preference used by @std/media-types: IANA, custom, Apache, then nginx.
  // Generic binary and application/mp4 yield to more useful competing registrations.
  const priority = { nginx: 0, apache: 1, custom: 2, iana: 3 };
  const result: Record<string, string> = Object.create(null);
  for (const type of Object.keys(database).toSorted()) {
    const candidate = database[type];
    for (const extension of candidate.extensions ?? []) {
      const current = result[extension];
      if (current && current !== "application/octet-stream" && current !== "application/mp4") {
        const existingRank = priority[database[current].source ?? "custom"];
        const candidateRank = priority[candidate.source ?? "custom"];
        if (
          existingRank > candidateRank ||
          (existingRank === candidateRank && current.startsWith("application/"))
        ) continue;
      }
      result[extension] = type;
    }
  }
  return Object.freeze(result);
}

/** Produce a dependency-free lookup table, retaining provenance in the published module. */
export function renderMediaTypes(database: MediaTypeDatabase): string {
  const entries = Object.entries(createExtensionMap(database))
    .toSorted(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([extension, type]) => `  ${JSON.stringify(extension)}: ${JSON.stringify(type)},`)
    .join("\n");
  return `${generatedComment("//")}// Derived from mime-db ${mediaTypeSource.version} (MIT).
// Source: ${mediaTypeSource.database.source}
// SHA-256: ${mediaTypeSource.database.sha256}
// Full upstream license and attribution: THIRD_PARTY_NOTICES.md.

/** Registered filename extensions; generated from the complete pinned upstream database. */
export const mediaTypeByExtension: Readonly<Record<string, string>> = Object.freeze({
${entries}
});
`;
}

/** Validate both checked-in upstream artifacts before using or redistributing them. */
export async function readMediaTypeInputs(root: URL = workspace.root): Promise<{
  database: MediaTypeDatabase;
  license: string;
}> {
  const [database, license] = await Promise.all(
    [mediaTypeSource.database, mediaTypeSource.license].map(async (artifact) => {
      const body = await Deno.readTextFile(new URL(artifact.destination, root));
      await verifyInput(body, artifact.sha256, artifact.destination);
      return body;
    }),
  );
  return { database: JSON.parse(database) as MediaTypeDatabase, license };
}

/** Download pinned inputs unless cached, then generate the offline runtime registry. */
export async function generateMediaTypes(
  options: { cached: boolean },
  paths: WorkspacePaths = workspace,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  if (!options.cached) {
    // Validate the complete download before replacing any checked-in input.
    const inputs = await Promise.all(
      [mediaTypeSource.database, mediaTypeSource.license].map(async (artifact) => {
        const response = await fetcher(artifact.source);
        if (!response.ok) {
          throw new Error(`MIME input download failed: ${response.status} ${artifact.source}`);
        }
        const body = await response.text();
        await verifyInput(body, artifact.sha256, artifact.source);
        return { artifact, body };
      }),
    );
    for (const { artifact, body } of inputs) {
      const target = new URL(artifact.destination, paths.root);
      await Deno.mkdir(new URL("./", target), { recursive: true });
      await Deno.writeTextFile(target, body);
    }
  }
  const { database } = await readMediaTypeInputs(paths.root);
  const target = new URL("src/fluent-api/generated-media-types.ts", paths.packages.pangit);
  await Deno.mkdir(new URL("./", target), { recursive: true });
  await Deno.writeTextFile(target, renderMediaTypes(database));
}

async function verifyInput(body: string, expected: string, source: string): Promise<void> {
  const actual = await sha256(body);
  if (actual !== expected) {
    throw new Error(`MIME input hash mismatch for ${source}: ${actual} != ${expected}`);
  }
}
