/** Collect supported OpenAPI operations and preserve their native path, parameter, and media contracts. */
import { compareText } from "./naming.ts";
import {
  asBoolean,
  asObject,
  asString,
  firstServerUrl,
  httpMethods,
  objectEntries,
  resolveObject,
} from "./openapi.ts";
import type { JsonObject, OpenApiDocument, OpenApiHttpMethod } from "./openapi.ts";

export type ParameterModel = {
  name: string;
  location: "header" | "path" | "query";
  required: boolean;
  schema: unknown;
  description?: string;
  deprecated?: boolean;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  multiSegment?: boolean;
};

type BodyModel = {
  required: boolean;
  description?: string;
  content: readonly MediaModel[];
};

export type MediaModel = {
  mediaType: string;
  schema: unknown;
};

type ResponseModel = {
  status: number | "default";
  description?: string;
  content: readonly MediaModel[];
  headers: readonly string[];
};

type SecurityRequirementModel = Readonly<Record<string, readonly string[]>>;

type PathGroupModel = {
  start: number;
  end: number;
  parameters?: readonly string[];
  selector?: string;
  defaultIncluded?: boolean;
};

export type OperationModel = {
  key: string;
  operationId: string;
  method: Uppercase<OpenApiHttpMethod>;
  path: string;
  pathGroups: readonly PathGroupModel[];
  summary?: string;
  description?: string;
  deprecated?: boolean;
  externalDocs?: string;
  tags: readonly string[];
  parameters: readonly ParameterModel[];
  body?: BodyModel;
  responses: readonly ResponseModel[];
  security?: readonly SecurityRequirementModel[];
  server?: string;
};

export function collectOperations(document: OpenApiDocument): OperationModel[] {
  const operations: OperationModel[] = [];
  const pathCollections: [string, JsonObject][] = [
    ["paths", document.paths],
    ...((asObject(document["x-ms-paths"])) === undefined
      ? []
      : [["x-ms-paths", asObject(document["x-ms-paths"])!]] as [string, JsonObject][]),
  ];

  for (const [collectionName, paths] of pathCollections) {
    for (const [rawPath, pathValue] of objectEntries(paths)) {
      const pathItem = resolveObject(document, pathValue);
      if (pathItem === undefined) {
        throw new Error(`${collectionName}.${rawPath} is not a valid path item`);
      }
      if (pathItem.trace !== undefined) {
        throw new Error(`${collectionName}.${rawPath}.trace is unsupported`);
      }
      for (const method of httpMethods) {
        if (pathItem[method] === undefined) continue;
        const operation = resolveObject(document, pathItem[method]);
        if (operation === undefined) {
          throw new Error(`${collectionName}.${rawPath}.${method} is not a valid operation`);
        }
        operations.push(
          buildOperation(document, collectionName, rawPath, method, pathItem, operation),
        );
      }
    }
  }
  return operations.toSorted((left, right) => compareText(left.key, right.key));
}

function buildOperation(
  document: OpenApiDocument,
  collectionName: string,
  rawPath: string,
  method: OpenApiHttpMethod,
  pathItem: JsonObject,
  operation: JsonObject,
): OperationModel {
  const normalizedPath = normalizePath(rawPath, collectionName === "x-ms-paths");
  const key = `${collectionName}:${method}:${rawPath}`;
  const operationId = asString(operation.operationId) ?? `${method} ${normalizedPath.path}`;
  const parameters = collectParameters(
    document,
    pathItem.parameters,
    operation.parameters,
    normalizedPath.path,
    normalizedPath.multiSegmentParameters,
    normalizedPath.optionalPathParameters,
  );
  const body = collectRequestBody(document, operation.requestBody);
  const responses = collectResponses(document, operation.responses);
  const tags = Array.isArray(operation.tags)
    ? operation.tags.filter((tag): tag is string => typeof tag === "string").toSorted(compareText)
    : [];
  const externalDocs = asString(asObject(operation.externalDocs)?.url);
  if (objectEntries(operation.callbacks).length > 0) {
    throw new Error(`${method.toUpperCase()} ${normalizedPath.path} uses unsupported callbacks`);
  }
  return {
    key,
    operationId,
    method: method.toUpperCase() as Uppercase<OpenApiHttpMethod>,
    path: normalizedPath.path,
    pathGroups: normalizedPath.pathGroups,
    summary: asString(operation.summary),
    description: asString(operation.description),
    deprecated: asBoolean(operation.deprecated),
    externalDocs,
    tags,
    parameters,
    body,
    responses,
    security: collectSecurityRequirements(
      Object.hasOwn(operation, "security") ? operation.security : document.security,
      `${method.toUpperCase()} ${normalizedPath.path}`,
    ),
    server: firstServerUrl(operation.servers) ?? firstServerUrl(pathItem.servers),
  };
}

function normalizePath(
  rawPath: string,
  hasEmbeddedQuery: boolean,
): {
  path: string;
  pathGroups: readonly PathGroupModel[];
  multiSegmentParameters: ReadonlySet<string>;
  optionalPathParameters: ReadonlySet<string>;
} {
  const sourcePath = hasEmbeddedQuery ? rawPath.split("?", 1)[0] : rawPath;
  const parts: Array<{ group: boolean; text: string }> = [];
  let text = "";
  let group = false;
  for (let index = 0; index < sourcePath.length; index++) {
    const character = sourcePath[index];
    const escaped = character === "\\" && ["(", ")"].includes(sourcePath[index + 1] ?? "");
    if (escaped) {
      text += sourcePath[++index];
    } else if (character === "(") {
      if (group) throw new Error(`${rawPath} contains a nested optional path group`);
      if (text !== "") parts.push({ group: false, text });
      text = "";
      group = true;
    } else if (character === ")") {
      if (!group) throw new Error(`${rawPath} contains an unmatched optional path group close`);
      parts.push({ group: true, text });
      text = "";
      group = false;
    } else {
      text += character;
    }
  }
  if (group) throw new Error(`${rawPath} contains an unclosed optional path group`);
  if (text !== "") parts.push({ group: false, text });

  const multiSegmentParameters = new Set<string>();
  const normalizedParts = parts.map((part) => {
    const normalizedText = part.text.replaceAll(
      /\*([A-Za-z_][A-Za-z\d_]*)/g,
      (_placeholder, name: string) => {
        multiSegmentParameters.add(name);
        return `{${name}}`;
      },
    );
    return {
      ...part,
      text: normalizedText,
      parameters: uniqueStrings(
        [...normalizedText.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]),
      ),
    };
  });
  const groupParameters = normalizedParts.map((part, index): readonly string[] => {
    if (!part.group || part.parameters.length > 0) return part.parameters;
    const next = normalizedParts[index + 1];
    if (next?.group && next.parameters.length > 0) return next.parameters;
    const previous = normalizedParts[index - 1];
    return previous?.group && previous.parameters.length > 0 ? previous.parameters : [];
  });

  let path = sourcePath.startsWith("/") ? "" : "/";
  const pathGroups: PathGroupModel[] = [];
  let pathGroupIndex = 0;
  for (const [index, part] of normalizedParts.entries()) {
    const start = path.length;
    for (const character of part.text) {
      if (character !== "/" || !path.endsWith("/")) path += character;
    }
    if (part.group) {
      if (start === path.length) {
        throw new Error(`${rawPath} contains an empty optional path group`);
      }
      const parameters = groupParameters[index];
      pathGroups.push(
        parameters.length > 0 ? { start, end: path.length, parameters } : {
          start,
          end: path.length,
          selector: String(pathGroupIndex),
          defaultIncluded: true,
        },
      );
      pathGroupIndex++;
    }
  }
  const optionalPathParameters = new Set(
    pathGroups.flatMap((value) => value.parameters ?? []),
  );
  return { path, pathGroups, multiSegmentParameters, optionalPathParameters };
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function collectParameters(
  document: OpenApiDocument,
  pathParameters: unknown,
  operationParameters: unknown,
  path: string,
  wildcardParameters: ReadonlySet<string>,
  optionalPathParameters: ReadonlySet<string>,
): ParameterModel[] {
  const parameterMap = new Map<string, ParameterModel>();
  if (pathParameters !== undefined && !Array.isArray(pathParameters)) {
    throw new Error(`${path} path-level parameters must be an array`);
  }
  if (operationParameters !== undefined && !Array.isArray(operationParameters)) {
    throw new Error(`${path} operation parameters must be an array`);
  }
  assertNoDuplicateParameters(document, pathParameters, `${path} path-level`);
  assertNoDuplicateParameters(document, operationParameters, `${path} operation`);
  for (
    const value of [
      ...(Array.isArray(pathParameters) ? pathParameters : []),
      ...(Array.isArray(operationParameters) ? operationParameters : []),
    ]
  ) {
    const parameter = resolveObject(document, value);
    if (parameter === undefined) {
      throw new Error(`${path} contains an invalid parameter`);
    }
    const location = asString(parameter?.in);
    const name = asString(parameter?.name);
    if (name === undefined || location === undefined) {
      throw new Error(`${path} contains a parameter without string name/in`);
    }
    if (location === "cookie") {
      throw new Error(`${path} parameter ${name} uses unsupported cookie location`);
    }
    if (location !== "header" && location !== "path" && location !== "query") {
      throw new Error(`${path} parameter ${name} uses unsupported location ${location}`);
    }
    if (parameter.schema === undefined) {
      throw new Error(`${path} parameter ${name} has no supported schema`);
    }
    const style = asString(parameter.style);
    const explode = asBoolean(parameter.explode);
    const allowReserved = asBoolean(parameter.allowReserved);
    if (allowReserved === true) {
      throw new Error(`${path} parameter ${name} uses unsupported allowReserved serialization`);
    }
    if (
      (location === "path" || location === "header") &&
      ((style !== undefined && style !== "simple") || explode === true)
    ) {
      throw new Error(`${path} parameter ${name} uses unsupported ${location} serialization`);
    }
    if (
      (location === "path" || location === "header") &&
      !parameterSchemaIsPrimitive(document, parameter.schema)
    ) {
      throw new Error(`${path} parameter ${name} uses unsupported ${location} collection schema`);
    }
    if (
      location === "query" && style !== undefined &&
      !["deepObject", "form", "pipeDelimited", "spaceDelimited"].includes(style)
    ) {
      throw new Error(`${path} parameter ${name} uses unsupported query style ${style}`);
    }
    if (location === "query" && style === "deepObject") {
      if (explode !== true) {
        throw new Error(`${path} deepObject query parameter ${name} requires explode: true`);
      }
      if (!parameterSchemaIsFlatPrimitiveObject(document, parameter.schema)) {
        throw new Error(
          `${path} deepObject query parameter ${name} requires a closed flat primitive object schema`,
        );
      }
    }
    parameterMap.set(`${location}:${name}`, {
      name,
      location,
      required: location === "path"
        ? !optionalPathParameters.has(name)
        : asBoolean(parameter.required) === true,
      schema: parameter.schema,
      description: asString(parameter.description),
      deprecated: asBoolean(parameter.deprecated),
      style,
      explode,
      allowReserved,
      multiSegment: location === "path" &&
        (asBoolean(parameter["x-multi-segment"]) || wildcardParameters.has(name)),
    });
  }

  const pathCaptures = new Set([...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]));
  for (const name of pathCaptures) {
    if (!parameterMap.has(`path:${name}`)) {
      parameterMap.set(`path:${name}`, {
        name,
        location: "path",
        required: !optionalPathParameters.has(name),
        schema: { type: "string" },
        description:
          "Path capture synthesized from an upstream route missing its parameter object.",
        multiSegment: wildcardParameters.has(name),
      });
    }
  }
  for (const parameter of parameterMap.values()) {
    if (parameter.location === "path" && !pathCaptures.has(parameter.name)) {
      throw new Error(`${path} path parameter ${parameter.name} has no matching path capture`);
    }
  }
  return [...parameterMap.values()].toSorted((left, right) =>
    compareText(`${left.location}:${left.name}`, `${right.location}:${right.name}`)
  );
}

function assertNoDuplicateParameters(
  document: OpenApiDocument,
  values: unknown,
  location: string,
): void {
  if (!Array.isArray(values)) return;
  const seen = new Set<string>();
  for (const value of values) {
    const parameter = resolveObject(document, value);
    const parameterLocation = asString(parameter?.in);
    const name = asString(parameter?.name);
    if (parameterLocation === undefined || name === undefined) continue;
    const key = `${parameterLocation}:${name}`;
    if (seen.has(key)) throw new Error(`${location} parameters contain duplicate ${key}`);
    seen.add(key);
  }
}

function parameterSchemaIsPrimitive(document: OpenApiDocument, value: unknown): boolean {
  const schema = resolveObject(document, value);
  if (schema === undefined) return false;
  if (Object.hasOwn(schema, "const")) return isPrimitiveSchemaValue(schema.const);
  if (
    Array.isArray(schema.enum) && schema.enum.length > 0 &&
    schema.enum.every(isPrimitiveSchemaValue)
  ) {
    return true;
  }
  const type = asString(schema.type);
  if (["boolean", "integer", "number", "string"].includes(type ?? "")) return true;
  for (const keyword of ["oneOf", "anyOf"] as const) {
    const members = schema[keyword];
    if (
      Array.isArray(members) && members.length > 0 &&
      members.every((member) => parameterSchemaIsPrimitive(document, member))
    ) {
      return true;
    }
  }
  return false;
}

function parameterSchemaIsFlatPrimitiveObject(
  document: OpenApiDocument,
  value: unknown,
): boolean {
  const schema = resolveObject(document, value);
  if (
    schema === undefined || asBoolean(schema.nullable) === true ||
    (asString(schema.type) !== "object" && asObject(schema.properties) === undefined &&
      schema.additionalProperties === undefined) ||
    ["allOf", "anyOf", "oneOf", "not"].some((keyword) => schema[keyword] !== undefined)
  ) {
    return false;
  }
  if (
    objectEntries(schema.properties).some(([, property]) =>
      !parameterSchemaIsPrimitive(document, property)
    )
  ) {
    return false;
  }
  if (schema.additionalProperties === false) return true;
  return asObject(schema.additionalProperties) !== undefined &&
    parameterSchemaIsPrimitive(document, schema.additionalProperties);
}

function isPrimitiveSchemaValue(value: unknown): boolean {
  return value === null || ["boolean", "number", "string"].includes(typeof value);
}

function collectRequestBody(document: OpenApiDocument, value: unknown): BodyModel | undefined {
  if (value === undefined) return undefined;
  const body = resolveObject(document, value);
  if (body === undefined) throw new Error("Request body is not a valid object or reference");
  const content = collectMedia(body.content, "request");
  if (content.length === 0) throw new Error("Request body has no media content");
  return {
    required: asBoolean(body.required) === true,
    description: asString(body.description),
    content,
  };
}

function collectResponses(document: OpenApiDocument, value: unknown): ResponseModel[] {
  const entries = objectEntries(value);
  if (entries.length === 0) throw new Error("Operation has no valid responses object");
  return entries.map(([statusValue, responseValue]) => {
    const response = resolveObject(document, responseValue);
    const status = statusValue === "default" ? "default" : Number(statusValue);
    if (response === undefined) throw new Error(`Response ${statusValue} is invalid`);
    if (status !== "default" && !Number.isInteger(status)) {
      throw new Error(`Unsupported response status ${statusValue}`);
    }
    if (objectEntries(response.links).length > 0) {
      throw new Error(`Response ${statusValue} uses unsupported links`);
    }
    return {
      status,
      description: asString(response.description),
      content: collectMedia(response.content, "response"),
      headers: collectResponseHeaders(document, response.headers, statusValue),
    } satisfies ResponseModel;
  }).toSorted((left, right) => {
    if (left.status === "default") return right.status === "default" ? 0 : 1;
    if (right.status === "default") return -1;
    return left.status - right.status;
  });
}

function collectMedia(value: unknown, kind: "request" | "response"): MediaModel[] {
  if (value === undefined) return [];
  const entries = objectEntries(value);
  if (entries.length === 0) throw new Error(`${kind} content must be a non-empty object`);
  const content = entries.map(([mediaType, mediaValue]) => {
    const essence = mediaTypeEssence(mediaType);
    if (essence === "" || !essence.includes("/") || essence.includes("*")) {
      throw new Error(`${kind} media ${mediaType} has an unsupported media type`);
    }
    const media = asObject(mediaValue);
    if (media === undefined) throw new Error(`${kind} media ${mediaType} is invalid`);
    if (kind === "request" && media.encoding !== undefined) {
      throw new Error(`Request media ${mediaType} uses unsupported encoding metadata`);
    }
    return { mediaType, schema: media.schema };
  }).toSorted((left, right) => compareMediaTypes(left.mediaType, right.mediaType));
  const seenEssences = new Map<string, string>();
  for (const media of content) {
    const essence = mediaTypeEssence(media.mediaType);
    const previous = seenEssences.get(essence);
    if (previous !== undefined) {
      throw new Error(
        `${kind} media ${media.mediaType} duplicates normalized media type ${previous}`,
      );
    }
    seenEssences.set(essence, media.mediaType);
  }
  return content;
}

function collectResponseHeaders(
  document: OpenApiDocument,
  value: unknown,
  status: string,
): string[] {
  if (value === undefined) return [];
  if (asObject(value) === undefined) {
    throw new Error(`Response ${status} headers must be an object`);
  }
  return objectEntries(value).map(([name, headerValue]) => {
    if (resolveObject(document, headerValue) === undefined) {
      throw new Error(`Response ${status} header ${name} is invalid`);
    }
    return name;
  }).toSorted(compareText);
}

export function collectSecuritySchemes(document: OpenApiDocument): Record<string, JsonObject> {
  const value = asObject(document.components)?.securitySchemes;
  if (value === undefined) return {};
  if (asObject(value) === undefined) {
    throw new Error("components.securitySchemes must be an object");
  }
  return Object.fromEntries(
    objectEntries(value).map(([name, schemeValue]) => {
      const scheme = resolveObject(document, schemeValue);
      if (scheme === undefined) throw new Error(`Security scheme ${name} is invalid`);
      return [name, scheme];
    }),
  );
}

function collectSecurityRequirements(
  value: unknown,
  location: string,
): readonly SecurityRequirementModel[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error(`${location} security must be an array`);
  return value.map((requirementValue, index) => {
    const requirement = asObject(requirementValue);
    if (requirement === undefined) {
      throw new Error(`${location} security requirement ${index} must be an object`);
    }
    return Object.fromEntries(
      objectEntries(requirement).map(([scheme, scopesValue]) => {
        if (
          !Array.isArray(scopesValue) ||
          !scopesValue.every((scope): scope is string => typeof scope === "string")
        ) {
          throw new Error(`${location} security requirement ${scheme} scopes must be strings`);
        }
        return [scheme, [...scopesValue].toSorted(compareText)];
      }),
    );
  });
}

export function operationInputIsOptional(operation: OperationModel): boolean {
  return !operation.parameters.some((parameter) => parameter.required) &&
    operation.body?.required !== true;
}

export function responseDecodeMode(media: MediaModel): "binary" | "json" | "text" {
  if (isBinaryMediaType(media.mediaType)) return "binary";
  if (isResponseJsonMediaType(media.mediaType)) return "json";
  if (isTextMediaType(media.mediaType) || schemaIsText(media.schema)) return "text";
  return "binary";
}

export function isStandardJsonMediaType(mediaType: string): boolean {
  const value = mediaTypeEssence(mediaType);
  return value === "application/json" || value.endsWith("+json") || value.includes("/json");
}

function isResponseJsonMediaType(mediaType: string): boolean {
  const value = mediaTypeEssence(mediaType);
  // GitHub documents this response representation as object+JSON, despite its legacy media key.
  return value === "application/vnd.github.object" || isStandardJsonMediaType(value);
}

export function isFormMediaType(mediaType: string): boolean {
  const value = mediaTypeEssence(mediaType);
  return value === "application/x-www-form-urlencoded" || value.startsWith("multipart/");
}

function isTextMediaType(mediaType: string): boolean {
  const value = mediaTypeEssence(mediaType);
  return value.startsWith("text/") || value.includes("xml") || value.includes("yaml") ||
    value.includes("yml");
}

function isBinaryMediaType(mediaType: string): boolean {
  const value = mediaTypeEssence(mediaType);
  return value.startsWith("multipart/") || value.startsWith("image/") ||
    value.startsWith("audio/") || value.startsWith("video/") || value.startsWith("font/") ||
    value === "application/octet-stream" || value.includes("zip") || value.includes("gzip") ||
    value === "application/pdf";
}

function mediaTypeEssence(mediaType: string): string {
  return mediaType.split(";", 1)[0].trim().toLowerCase();
}

export function schemaIsText(value: unknown): boolean {
  const schema = asObject(value);
  if (schema === undefined) return false;
  const type = asString(schema.type);
  const format = asString(schema.format)?.toLowerCase();
  if ((type === "string" || type === "text") && format !== "binary" && format !== "byte") {
    return true;
  }
  return Array.isArray(schema.enum) && schema.enum.length > 0 &&
    schema.enum.every((member) => typeof member === "string");
}

function compareMediaTypes(left: string, right: string): number {
  return mediaTypePriority(left) - mediaTypePriority(right) || compareText(left, right);
}

function mediaTypePriority(mediaType: string): number {
  const essence = mediaTypeEssence(mediaType);
  if (essence === "application/json") return 0;
  if (essence.endsWith("+json") || essence.includes("json")) return 1;
  if (essence.startsWith("text/")) return 2;
  return 3;
}
