import { renderJsDoc } from "./naming.ts";
import {
  isFormMediaType,
  isStandardJsonMediaType,
  responseDecodeMode,
  schemaIsText,
} from "./operations.ts";
import type { MediaModel, OperationModel, ParameterModel } from "./operations.ts";
import type { RenderedOperation } from "./rest-client-render-context.ts";
import { union } from "./schema.ts";
import type { SchemaRenderer } from "./schema.ts";

export function renderOperationTypes(
  operation: RenderedOperation,
  renderer: SchemaRenderer,
): string {
  return `${renderInputType(operation, renderer)}\n\n${renderResponseType(operation, renderer)}`;
}

function renderInputType(operation: RenderedOperation, renderer: SchemaRenderer): string {
  const groups: string[] = [];
  for (const location of ["path", "query", "header"] as const) {
    const parameters = operation.parameters.filter((parameter) => parameter.location === location);
    if (parameters.length === 0) continue;
    const propertyName = location === "header" ? "headers" : location;
    const required = parameters.some((parameter) => parameter.required);
    const parameterType = location === "path"
      ? renderPathParameterObject(operation, parameters, renderer)
      : renderParameterObject(parameters, renderer);
    groups.push(
      `  ${propertyName}${required ? "" : "?"}: ${indentContinuation(parameterType, 2)};`,
    );
  }
  const pathGroupSelectors = operation.pathGroups.flatMap((group) =>
    group.selector === undefined ? [] : [group.selector]
  );
  if (pathGroupSelectors.length > 0) {
    groups.push(`  pathGroups?: {
${pathGroupSelectors.map((selector) => `    ${JSON.stringify(selector)}?: boolean;`).join("\n")}
  };`);
  }
  if (operation.body !== undefined) {
    const bodyType = operation.body.content.length === 0
      ? "RestBody<string, unknown>"
      : union(operation.body.content.map((media) =>
        `RestBody<${JSON.stringify(media.mediaType)}, ${renderRequestBodyType(media, renderer)}>`
      ));
    const documentation = renderJsDoc([operation.body.description], { indent: "  " });
    if (documentation !== "") groups.push(documentation);
    groups.push(`  body${operation.body.required ? "" : "?"}: ${indentContinuation(bodyType, 2)};`);
  }
  const value = groups.length === 0 ? "Record<string, never>" : `{
${groups.join("\n")}
}`;
  return `export type ${operation.inputTypeName} = ${value};`;
}

function renderParameterObject(
  parameters: readonly ParameterModel[],
  renderer: SchemaRenderer,
): string {
  const lines = ["{"];
  for (const parameter of parameters) {
    const documentation = renderJsDoc([parameter.description], {
      deprecated: parameter.deprecated,
      indent: "  ",
    });
    if (documentation !== "") lines.push(documentation);
    lines.push(
      `  ${JSON.stringify(parameter.name)}${parameter.required ? "" : "?"}: ${
        indentContinuation(renderer.render(parameter.schema), 2)
      };`,
    );
  }
  lines.push("}");
  return lines.join("\n");
}

function renderPathParameterObject(
  operation: OperationModel,
  parameters: readonly ParameterModel[],
  renderer: SchemaRenderer,
): string {
  const constrainedGroups = operation.pathGroups
    .flatMap((group) =>
      group.parameters !== undefined && group.parameters.length > 1 ? [group.parameters] : []
    )
    .filter((names, index, groups) =>
      groups.findIndex((candidate) => JSON.stringify(candidate) === JSON.stringify(names)) === index
    );
  if (constrainedGroups.length === 0) return renderParameterObject(parameters, renderer);

  const constrainedNames = new Set(constrainedGroups.flat());
  const members: string[] = [];
  const baseParameters = parameters.filter((parameter) => !constrainedNames.has(parameter.name));
  if (baseParameters.length > 0) members.push(renderParameterObject(baseParameters, renderer));
  for (const names of constrainedGroups) {
    const groupParameters = names.map((name) => {
      const parameter = parameters.find((candidate) => candidate.name === name);
      if (parameter === undefined) {
        throw new Error(
          `${operation.operationId} optional path group parameter ${name} is missing`,
        );
      }
      return { ...parameter, required: true };
    });
    const absent = `{
${names.map((name) => `  ${JSON.stringify(name)}?: never;`).join("\n")}
}`;
    members.push(`(${renderParameterObject(groupParameters, renderer)} | ${absent})`);
  }
  return members.join(" & ");
}

function renderResponseType(operation: RenderedOperation, renderer: SchemaRenderer): string {
  const members: string[] = [];
  const explicitStatuses = new Set(
    operation.responses.flatMap((response) =>
      response.status === "default" ? [] : [response.status]
    ),
  );
  for (const response of operation.responses) {
    const statusVariants = response.status === "default"
      ? renderDefaultResponseStatuses(
        explicitStatuses,
        operation.method !== "HEAD" && response.content.length > 0,
      )
      : [{
        status: String(response.status),
        ok: response.status >= 200 && response.status < 300 ? "true" as const : "false" as const,
      }];
    const noContent = operation.method === "HEAD" || response.status === 204 ||
      response.status === 205;
    if (
      response.status === "default" && operation.method !== "HEAD" && response.content.length > 0
    ) {
      for (const noContentStatus of [204, 205] as const) {
        if (explicitStatuses.has(noContentStatus)) continue;
        members.push(
          renderRestResponse(
            String(noContentStatus),
            "undefined",
            "undefined",
            "true",
            response.headers,
          ),
        );
      }
    }
    for (const { status, ok } of statusVariants) {
      if (response.content.length === 0 || noContent) {
        members.push(renderRestResponse(status, "undefined", "undefined", ok, response.headers));
      } else {
        for (const media of response.content) {
          members.push(
            renderRestResponse(
              status,
              renderResponseBodyType(media, renderer),
              JSON.stringify(media.mediaType),
              ok,
              response.headers,
            ),
          );
        }
      }
    }
  }
  members.push("RestUndocumentedResponse");
  return `export type ${operation.responseTypeName} =\n  | ${
    [...new Set(members)].join("\n  | ")
  };`;
}

function renderDefaultResponseStatuses(
  explicitStatuses: ReadonlySet<number>,
  excludeNoContentStatuses: boolean,
): readonly [{ status: string; ok: "true" }, { status: string; ok: "false" }] {
  const excluded = new Set(explicitStatuses);
  if (excludeNoContentStatuses) {
    excluded.add(204);
    excluded.add(205);
  }
  const successStatuses = [...excluded]
    .filter((status) => status >= 200 && status < 300)
    .toSorted((left, right) => left - right);
  const failureStatuses = [...excluded]
    .filter((status) => status < 200 || status >= 300)
    .toSorted((left, right) => left - right);
  return [
    {
      status: successStatuses.length === 0
        ? "RestSuccessfulStatus"
        : `Exclude<RestSuccessfulStatus, ${successStatuses.join(" | ")}>`,
      ok: "true",
    },
    {
      status: `Exclude<RestHttpStatus, ${
        ["RestSuccessfulStatus", ...failureStatuses.map(String)].join(" | ")
      }>`,
      ok: "false",
    },
  ];
}

function renderRequestBodyType(media: MediaModel, renderer: SchemaRenderer): string {
  if (isStandardJsonMediaType(media.mediaType)) {
    return `RestJsonValue<RestRequestValue<${renderer.render(media.schema)}>>`;
  }
  if (isFormMediaType(media.mediaType)) {
    return `RestRequestValue<${renderer.render(media.schema)}>`;
  }
  return responseDecodeMode(media) === "text" ? "string" : "RestBinary";
}

function renderResponseBodyType(media: MediaModel, renderer: SchemaRenderer): string {
  const mode = responseDecodeMode(media);
  if (mode === "json") return `RestJsonValue<${renderer.render(media.schema)}>`;
  if (mode === "binary") return "globalThis.Blob";
  return schemaIsText(media.schema) ? renderer.render(media.schema) : "string";
}

function renderRestResponse(
  status: string,
  body: string,
  mediaType: string,
  ok: string,
  headers: readonly string[],
): string {
  const headerType = headers.length === 0
    ? ""
    : `, { ${headers.map((name) => `readonly ${JSON.stringify(name)}?: string`).join("; ")} }`;
  return `RestResponse<${status}, ${body}, ${mediaType}, ${ok}${headerType}>`;
}

function indentContinuation(value: string, spaces: number): string {
  const indent = " ".repeat(spaces);
  return value.replaceAll("\n", `\n${indent}`);
}
