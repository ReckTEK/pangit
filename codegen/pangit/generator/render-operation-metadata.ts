import { responseDecodeMode } from "./operations.ts";
import type { RenderedOperation } from "./render-context.ts";

export function renderOperationDefinition(operation: RenderedOperation): string {
  const pathParameters = operation.parameters.filter((parameter) => parameter.location === "path");
  const queryParameters = operation.parameters.filter((parameter) =>
    parameter.location === "query"
  );
  const requestMediaTypes = operation.body?.content.map((media) => media.mediaType) ?? [];
  const fields = [
    `id: ${JSON.stringify(operation.operationId)}`,
    `method: ${JSON.stringify(operation.method)}`,
    `path: ${JSON.stringify(operation.path)}`,
    ...(operation.server === undefined ? [] : [`server: ${JSON.stringify(operation.server)}`]),
    ...(operation.pathGroups.length === 0
      ? []
      : [`pathGroups: ${JSON.stringify(operation.pathGroups)}`]),
    ...(pathParameters.length === 0
      ? []
      : [`pathParameters: ${
        JSON.stringify(pathParameters.map((parameter) => ({
          name: parameter.name,
          ...(parameter.multiSegment ? { multiSegment: true } : {}),
        })))
      }`]),
    ...(queryParameters.length === 0
      ? []
      : [`queryParameters: ${
        JSON.stringify(queryParameters.map((parameter) => {
          const style = parameter.style ?? "form";
          return {
            name: parameter.name,
            style,
            explode: parameter.explode ?? style === "form",
            ...(parameter.allowReserved ? { allowReserved: true } : {}),
          };
        }))
      }`]),
    ...(requestMediaTypes.length === 0
      ? []
      : [`requestMediaTypes: ${JSON.stringify(requestMediaTypes)}`]),
    ...(operation.security === undefined
      ? []
      : [`security: ${JSON.stringify(operation.security)}`]),
    `responses: ${
      JSON.stringify(operation.responses.map((response) => ({
        status: response.status,
        mediaTypes: response.content.map((media) => media.mediaType),
        ...(response.content.length === 0 ? {} : {
          decoders: Object.fromEntries(
            response.content.map((media) => [media.mediaType, responseDecodeMode(media)]),
          ),
        }),
        ...(response.headers.length === 0 ? {} : { headers: response.headers }),
      })))
    }`,
  ];
  return `  ${operation.methodName}: {
    ${fields.join(",\n    ")},
  },`;
}
