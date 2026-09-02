/** Raw specification parsing and OpenAPI document normalization. @module */
import { parse as parseYaml } from "@std/yaml";
// @ts-types="npm:@types/swagger2openapi@7.0.4"
import swagger2openapi from "swagger2openapi";
import type { OpenAPIV2 } from "openapi-types";

import {
  getDownloadedOpenApiFileName,
  type GitHost,
  gitHostOpenApiSources,
} from "../openapi-source-catalog.ts";

export type JsonObject = Record<string, unknown>;
export type NormalizedOpenApiTransform = (document: JsonObject) => void;

export const targetOpenApiVersion = "3.0.3";

const downloadedSpecificationsDirectory = new URL("../downloaded/", import.meta.url);
const normalizedSpecsDirectory = new URL("../normalized/", import.meta.url);

function downloadedSpecificationUrl(gitHost: GitHost, version: string): URL {
  return new URL(
    getDownloadedOpenApiFileName(gitHost, version),
    downloadedSpecificationsDirectory,
  );
}

function normalizedSpecUrl(gitHost: GitHost, version: string): URL {
  return new URL(`${gitHost}/${version}.json`, normalizedSpecsDirectory);
}

function assertJsonObject(
  value: unknown,
  gitHost: GitHost,
  version: string,
): asserts value is JsonObject {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${gitHost} ${version} OpenAPI specification is not an object`);
  }
}

async function readDownloadedSpecification(gitHost: GitHost, version: string): Promise<JsonObject> {
  const body = await Deno.readTextFile(downloadedSpecificationUrl(gitHost, version));
  const document: unknown = gitHostOpenApiSources[gitHost].format === "yaml"
    ? parseYaml(body)
    : JSON.parse(body);

  assertJsonObject(document, gitHost, version);
  return document;
}

async function writeNormalizedSpec(
  gitHost: GitHost,
  version: string,
  document: JsonObject,
  options: { readonly escapeHtml?: boolean; readonly trailingNewline?: boolean } = {},
): Promise<void> {
  if (document.openapi !== targetOpenApiVersion) {
    throw new Error(
      `${gitHost} ${version} normalizer produced OpenAPI ${
        String(document.openapi)
      }, expected ${targetOpenApiVersion}`,
    );
  }

  await Deno.mkdir(new URL(`${gitHost}/`, normalizedSpecsDirectory), { recursive: true });
  const json = JSON.stringify(document, null, 2);
  const serialized = options.escapeHtml
    ? json.replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026")
    : json;
  await Deno.writeTextFile(
    normalizedSpecUrl(gitHost, version),
    `${serialized}${options.trailingNewline === false ? "" : "\n"}`,
  );
}

export async function normalizeSwagger2(
  gitHost: GitHost,
  version: string,
  transform?: NormalizedOpenApiTransform,
): Promise<void> {
  const document = await readDownloadedSpecification(gitHost, version);
  if (document.swagger !== "2.0") {
    throw new Error(`${gitHost} ${version} OpenAPI specification is not Swagger 2.0`);
  }

  const result = await swagger2openapi.convertObj(
    document as unknown as OpenAPIV2.Document,
    {
      patch: true,
      targetVersion: targetOpenApiVersion,
      warnOnly: false,
    },
  );
  const normalized: unknown = result.openapi;
  assertJsonObject(normalized, gitHost, version);
  transform?.(normalized);
  await writeNormalizedSpec(gitHost, version, normalized);
}

export async function normalizeOpenApi3(
  gitHost: GitHost,
  version: string,
  transform?: NormalizedOpenApiTransform,
  options?: { readonly escapeHtml?: boolean; readonly trailingNewline?: boolean },
): Promise<void> {
  const document = await readDownloadedSpecification(gitHost, version);
  if (typeof document.openapi !== "string" || !document.openapi.startsWith("3.0.")) {
    throw new Error(`${gitHost} ${version} OpenAPI specification is not OpenAPI 3.0.x`);
  }

  document.openapi = targetOpenApiVersion;
  transform?.(document);
  await writeNormalizedSpec(gitHost, version, document, options);
}

export async function passThroughOpenApi3(
  gitHost: GitHost,
  version: string,
): Promise<void> {
  const document = await readDownloadedSpecification(gitHost, version);
  if (
    gitHostOpenApiSources[gitHost].format !== "json" ||
    document.openapi !== targetOpenApiVersion
  ) {
    throw new Error(
      `${gitHost} ${version} OpenAPI specification is not OpenAPI ${targetOpenApiVersion} JSON`,
    );
  }
  await Deno.mkdir(new URL(`${gitHost}/`, normalizedSpecsDirectory), { recursive: true });
  await Deno.copyFile(
    downloadedSpecificationUrl(gitHost, version),
    normalizedSpecUrl(gitHost, version),
  );
}

export async function clearNormalizedOpenApiSpecifications(): Promise<void> {
  try {
    await Deno.remove(normalizedSpecsDirectory, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
}
