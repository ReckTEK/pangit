/** PanGit's managed client and dynamically loaded raw provider clients. */
export { PanGit } from "./client/mod.ts";
export { loadRestClient } from "./generated/mod.ts";

export type {
  Auth,
  AuthBranch,
  BasicAuthorization,
  Login,
  LoginOptions,
  MaybePromise,
  OAuthAuthorization,
  OAuthAuthorizedClient,
  OAuthAuthorizedClientFor,
  OAuthHandler,
  OAuthLoginRegistry,
  OAuthLoginStart,
  OAuthLoginTransaction,
  OAuthLoginTransactionFor,
  TokenAuthorization,
} from "./auth/core.ts";
export type { AuthAdapterNotImplementedError, OAuthCallbackError } from "./auth/errors.ts";
export type { AuthorizedClient, ClientOptions } from "./client/core.ts";
export type { SelectedClient } from "./client/mod.ts";
export type {
  Provider,
  ProviderVersion,
  RestClientProvider,
  RestClientTypeMap,
  RestClientVersion,
} from "./generated/mod.ts";
export type {
  AnyRestResponse,
  RestApiError,
  RestBinary,
  RestBody,
  RestClient,
  RestClientOptions,
  RestDocumentedSuccess,
  RestDocumentedSuccessBody,
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
  RestParseError,
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
  RestTransportError,
  RestUndocumentedResponse,
  RestUndocumentedResponseError,
} from "./rest/mod.ts";
