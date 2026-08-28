import { parse as parseYaml } from "@std/yaml";
// @ts-types="npm:@types/swagger2openapi@7.0.4"
import swagger2openapi from "swagger2openapi";
import type { OpenAPIV2 } from "openapi-types";

import {
  type ApiSpecProvider,
  apiSpecProviders,
  getVersionedRawApiSpecFileName,
} from "../sources.ts";

type JsonObject = Record<string, unknown>;

export const targetOpenApiVersion = "3.0.3";

const rawSpecsDirectory = new URL("../raw/", import.meta.url);
const normalizedSpecsDirectory = new URL("../normalized/", import.meta.url);

function rawSpecUrl(provider: ApiSpecProvider, version: string): URL {
  return new URL(getVersionedRawApiSpecFileName(provider, version), rawSpecsDirectory);
}

function normalizedSpecUrl(provider: ApiSpecProvider, version: string): URL {
  return new URL(`${provider}/${version}.json`, normalizedSpecsDirectory);
}

function assertJsonObject(
  value: unknown,
  provider: ApiSpecProvider,
  version: string,
): asserts value is JsonObject {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${provider} ${version} API specification is not an object`);
  }
}

async function readRawSpec(provider: ApiSpecProvider, version: string): Promise<JsonObject> {
  const body = await Deno.readTextFile(rawSpecUrl(provider, version));
  const document: unknown = apiSpecProviders[provider].format === "yaml"
    ? parseYaml(body)
    : JSON.parse(body);

  assertJsonObject(document, provider, version);
  return document;
}

async function writeNormalizedSpec(
  provider: ApiSpecProvider,
  version: string,
  document: JsonObject,
): Promise<void> {
  if (document.openapi !== targetOpenApiVersion) {
    throw new Error(
      `${provider} ${version} normalizer produced OpenAPI ${
        String(document.openapi)
      }, expected ${targetOpenApiVersion}`,
    );
  }

  await Deno.mkdir(new URL(`${provider}/`, normalizedSpecsDirectory), { recursive: true });
  await Deno.writeTextFile(
    normalizedSpecUrl(provider, version),
    `${JSON.stringify(document, null, 2)}\n`,
  );
}

export async function normalizeSwagger2(
  provider: ApiSpecProvider,
  version: string,
): Promise<void> {
  const document = await readRawSpec(provider, version);
  if (document.swagger !== "2.0") {
    throw new Error(`${provider} ${version} API specification is not Swagger 2.0`);
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
  assertJsonObject(normalized, provider, version);
  await writeNormalizedSpec(provider, version, normalized);
}

export async function normalizeOpenApi3(
  provider: ApiSpecProvider,
  version: string,
): Promise<void> {
  const document = await readRawSpec(provider, version);
  if (typeof document.openapi !== "string" || !document.openapi.startsWith("3.0.")) {
    throw new Error(`${provider} ${version} API specification is not OpenAPI 3.0.x`);
  }

  document.openapi = targetOpenApiVersion;
  await writeNormalizedSpec(provider, version, document);
}

export async function passThroughOpenApi3(
  provider: ApiSpecProvider,
  version: string,
): Promise<void> {
  const document = await readRawSpec(provider, version);
  if (
    apiSpecProviders[provider].format !== "json" ||
    document.openapi !== targetOpenApiVersion
  ) {
    throw new Error(
      `${provider} ${version} API specification is not OpenAPI ${targetOpenApiVersion} JSON`,
    );
  }
  await Deno.mkdir(new URL(`${provider}/`, normalizedSpecsDirectory), { recursive: true });
  await Deno.copyFile(rawSpecUrl(provider, version), normalizedSpecUrl(provider, version));
}

export async function clearNormalizedApiSpecs(): Promise<void> {
  try {
    await Deno.remove(normalizedSpecsDirectory, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
}
