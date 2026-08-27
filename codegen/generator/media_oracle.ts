import policyJson from "./media-policy.json" with { type: "json" };
import { asString, type JsonObject } from "./openapi.ts";

export type OpenApiRequestBodyFamily = "binary" | "form" | "json" | "text";
export type OpenApiResponseDecoder = "binary" | "json" | "text";
export type OpenApiResponseBodyFamily = "blob" | "json" | "string" | "undefined";

export type ReviewedRequestMediaPolicy = {
  family: OpenApiRequestBodyFamily;
  policy: string;
};

export type ReviewedResponseMediaPolicy = {
  bodyFamily: Exclude<OpenApiResponseBodyFamily, "undefined">;
  decoder: OpenApiResponseDecoder;
  policy: string;
  requiresTextSchema?: boolean;
};

type ReviewedMediaTypePolicy = {
  request?: ReviewedRequestMediaPolicy;
  response?: ReviewedResponseMediaPolicy;
};

type ReviewedMediaPolicyManifest = {
  mediaTypes: Readonly<Record<string, ReviewedMediaTypePolicy>>;
  version: 1;
};

const manifest = policyJson as ReviewedMediaPolicyManifest;
if (manifest.version !== 1) throw new Error("Unsupported reviewed media-policy version");

/** Resolve a reviewed request serializer policy; new media types require explicit review. */
export function reviewedRequestMediaPolicy(
  mediaType: string,
  resolvedSchema?: JsonObject,
): ReviewedRequestMediaPolicy {
  const policy = reviewedMediaType(mediaType).request;
  if (policy === undefined) {
    throw new Error(`No reviewed request media policy for ${JSON.stringify(mediaType)}`);
  }
  validateSchemaFact(mediaType, false, resolvedSchema);
  return policy;
}

/** Resolve a reviewed response decoder/type policy; new media types require explicit review. */
export function reviewedResponseMediaPolicy(
  mediaType: string,
  resolvedSchema?: JsonObject,
): ReviewedResponseMediaPolicy {
  const policy = reviewedMediaType(mediaType).response;
  if (policy === undefined) {
    throw new Error(`No reviewed response media policy for ${JSON.stringify(mediaType)}`);
  }
  validateSchemaFact(mediaType, policy.requiresTextSchema === true, resolvedSchema);
  return policy;
}

function reviewedMediaType(mediaType: string): ReviewedMediaTypePolicy {
  const essence = mediaType.split(";", 1)[0].trim().toLowerCase();
  const policy = manifest.mediaTypes[essence];
  if (policy === undefined) {
    throw new Error(`Unreviewed media type ${JSON.stringify(mediaType)}`);
  }
  return policy;
}

function validateSchemaFact(
  mediaType: string,
  requiresTextSchema: boolean,
  resolvedSchema: JsonObject | undefined,
): void {
  if (requiresTextSchema && !schemaIsText(resolvedSchema)) {
    throw new Error(
      `Reviewed media policy for ${JSON.stringify(mediaType)} requires a resolved text schema`,
    );
  }
}

function schemaIsText(schema: JsonObject | undefined): boolean {
  if (schema === undefined) return false;
  const type = asString(schema.type);
  const format = asString(schema.format)?.toLowerCase();
  if ((type === "string" || type === "text") && format !== "binary" && format !== "byte") {
    return true;
  }
  return Array.isArray(schema.enum) && schema.enum.length > 0 &&
    schema.enum.every((member) => typeof member === "string");
}
