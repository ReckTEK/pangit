import type { Provider, ProviderVersion } from "../../generated-rest-clients/git-host.ts";
import type { OperationOptions } from "./operation-options.ts";

export interface TokenAuthorizationInput {
  readonly token: string;
  readonly tokenType?: string;
}

export interface BasicAuthorizationInput {
  readonly username: string;
  readonly password: string;
  readonly oneTimePassword?: string;
}

export interface OAuthBeginInput {
  readonly clientId: string;
  readonly callbackUrl: URL;
  readonly scopes: readonly string[];
  readonly state: string;
  readonly codeChallenge: string;
  readonly codeChallengeMethod: "S256";
}

export interface OAuthBeginResult {
  readonly authorizationUrl: URL;
  readonly providerTransaction?: Readonly<Record<string, string>>;
}

export interface OAuthExchangeInput {
  readonly clientId: string;
  readonly clientSecret?: string;
  readonly callbackUrl: URL;
  readonly code: string;
  readonly codeVerifier: string;
  readonly providerTransaction?: Readonly<Record<string, string>>;
}

export interface OAuthTokenData {
  readonly accessToken: string;
  readonly tokenType: string;
  readonly expiresIn?: number;
  readonly refreshToken?: string;
  readonly scope?: string;
}

export interface AuthenticationAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
  TAuthorizedAdapter,
> {
  authorizeToken(
    input: TokenAuthorizationInput,
    options?: OperationOptions,
  ): Promise<TAuthorizedAdapter>;
  authorizeBasic(
    input: BasicAuthorizationInput,
    options?: OperationOptions,
  ): Promise<TAuthorizedAdapter>;
  beginOAuth(input: OAuthBeginInput): OAuthBeginResult;
  exchangeOAuthCode(
    input: OAuthExchangeInput,
    options?: OperationOptions,
  ): Promise<OAuthTokenData>;
}
