/** Fluent API authentication contracts and helpers. @module */

export type {
  Auth,
  AuthBranch,
  BasicAuthorization,
  MaybePromise,
  TokenAuthorization,
} from "./authentication-contracts.ts";
export { AuthAdapterNotImplementedError } from "./AuthAdapterNotImplementedError.ts";
export type {
  OAuthCookieCompletion,
  OAuthCookieFlow,
  OAuthCookieFlowOptions,
} from "./oauth-cookie-flow.ts";
export { createOAuthCookieFlow } from "./oauth-cookie-flow.ts";
export type {
  Login,
  LoginOptions,
  OAuthAuthorization,
  OAuthAuthorizedClient,
  OAuthAuthorizedClientFor,
  OAuthHandler,
  OAuthLoginRegistry,
  OAuthLoginStart,
  OAuthLoginTransaction,
  OAuthLoginTransactionFor,
} from "./oauth-contracts.ts";
export { createOAuthHandler } from "./oauth-handler.ts";
export type {
  OAuthCookieSameSite,
  OAuthTransactionCookie,
  OAuthTransactionCookieErrorCode,
  OAuthTransactionCookieOptions,
  OAuthTransactionCookieSecret,
} from "./oauth-transaction-cookie.ts";
export { createOAuthTransactionCookie } from "./oauth-transaction-cookie.ts";
export { OAuthCallbackError } from "./OAuthCallbackError.ts";
