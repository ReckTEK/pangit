/** Keep public provider-client package exports synchronized with the generation manifest. */
import type { RestClientSpecManifest } from "./rest-client-manifests.ts";
import { compareText } from "./naming.ts";

type JsonObject = Record<string, unknown>;

/** Render the package configuration with exactly the provider/version exports in the manifest. */
export function renderPackageConfigurationWithProviderClientExports(
  source: string,
  manifest: RestClientSpecManifest,
  label: string,
): string {
  const configuration = parseObject(source, label);
  const packageExports = asObject(configuration.exports);
  if (packageExports === undefined) {
    throw new Error(`Package configuration has no object exports map: ${label}`);
  }

  const generatedExports = directProviderClientExports(manifest);
  const synchronizedExports: JsonObject = {};
  let insertedGeneratedExports = false;
  for (const [specifier, target] of Object.entries(packageExports)) {
    if (isManagedProviderClientExport(specifier)) {
      if (!insertedGeneratedExports) {
        Object.assign(synchronizedExports, generatedExports);
        insertedGeneratedExports = true;
      }
      continue;
    }
    synchronizedExports[specifier] = target;
  }
  if (!insertedGeneratedExports) Object.assign(synchronizedExports, generatedExports);

  if (entriesEqual(packageExports, synchronizedExports)) return source;

  return `${JSON.stringify({ ...configuration, exports: synchronizedExports }, null, 2)}\n`;
}

function directProviderClientExports(manifest: RestClientSpecManifest): Record<string, string> {
  const exports: Record<string, string> = {};
  for (const provider of Object.keys(manifest.gitHosts).toSorted(compareText)) {
    for (
      const version of Object.keys(manifest.gitHosts[provider].versions).toSorted(compareText)
    ) {
      const specifier = `./providers/${provider}/${version}`;
      exports[specifier] = `./${manifest.gitHosts[provider].versions[version].artifacts.client}`;
    }
  }
  return exports;
}

function isManagedProviderClientExport(specifier: string): boolean {
  if (
    specifier === "./raw" || specifier === "./providers" ||
    specifier === "./providers/runtime"
  ) return true;
  const segments = specifier.split("/");
  return segments.length === 4 && segments[0] === "." &&
    (segments[1] === "raw" || segments[1] === "providers") &&
    segments[2].length > 0 && segments[3].length > 0;
}

function entriesEqual(left: JsonObject, right: JsonObject): boolean {
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);
  return leftEntries.length === rightEntries.length && leftEntries.every(
    ([key, value], index) => key === rightEntries[index][0] && value === rightEntries[index][1],
  );
}

function parseObject(source: string, label: string): JsonObject {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch (error) {
    throw new Error(`Invalid JSON package configuration: ${label}`, { cause: error });
  }
  const object = asObject(value);
  if (object === undefined) throw new Error(`Package configuration is not an object: ${label}`);
  return object;
}

function asObject(value: unknown): JsonObject | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as JsonObject
    : undefined;
}
