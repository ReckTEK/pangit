/**
 * Generated native-Fetch runtime for PanGit REST clients.
 *
 * Generated provider clients use this transport to preserve provider-native requests and
 * responses. Applications may import the same runtime from `@mannsion/pangit/providers/runtime` for
 * shared configuration, hooks, raw requests, and response helpers without loading a provider.
 *
 * @module
 */

export {
  deepFreezeRestMetadata,
  deepFreezeRestOperations,
  RestClient,
  RestTransportError,
} from "./rest-client.ts";
export {
  isRestDocumentedSuccess,
  isRestSuccess,
  RestApiError,
  RestParseError,
  RestUndocumentedResponseError,
  unwrapRestResponse,
} from "./response.ts";

export type {
  AnyRestResponse,
  RestBinary,
  RestBody,
  RestClientOptions,
  RestGeneratedDecodeMode,
  RestGeneratedRequestOptions,
  RestHeadersProvider,
  RestHttpStatus,
  RestInt64,
  RestJsonData,
  RestJsonNumber,
  RestJsonValue,
  RestMethod,
  RestOperation,
  RestOperationInput,
  RestOperationResponse,
  RestParseMode,
  RestPathGroup,
  RestPathParameter,
  RestQueryParameter,
  RestRequestContext,
  RestRequestOperation,
  RestRequestOptions,
  RestRequestValue,
  RestResponse,
  RestSecurityRequirement,
  RestSuccessfulStatus,
  RestUndocumentedResponse,
} from "./contracts/mod.ts";
export type { RestDocumentedSuccess, RestDocumentedSuccessBody } from "./response.ts";
