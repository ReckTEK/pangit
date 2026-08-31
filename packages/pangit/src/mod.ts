/**
 * PanGit's managed client, authentication API, and lazy provider-client selection.
 *
 * @module
 */
export { PanGit } from "./client/mod.ts";
export { loadRestClient } from "./providers/registry.ts";
export {
  AuthAdapterNotImplementedError,
  createOAuthCookieFlow,
  createOAuthTransactionCookie,
  OAuthCallbackError,
} from "./auth/mod.ts";

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
  OAuthCookieCompletion,
  OAuthCookieFlow,
  OAuthCookieFlowOptions,
  OAuthCookieSameSite,
  OAuthHandler,
  OAuthLoginRegistry,
  OAuthLoginStart,
  OAuthLoginTransaction,
  OAuthLoginTransactionFor,
  OAuthTransactionCookie,
  OAuthTransactionCookieErrorCode,
  OAuthTransactionCookieOptions,
  OAuthTransactionCookieSecret,
  TokenAuthorization,
} from "./auth/mod.ts";
export type { AuthorizedClient, ClientOptions } from "./providers/managed-client.ts";
export type { SelectedClient } from "./client/mod.ts";
export type {
  Provider,
  ProviderVersion,
  RestClientProvider,
  RestClientTypeMap,
  RestClientVersion,
} from "./providers/mod.ts";
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
} from "./providers/runtime/mod.ts";
