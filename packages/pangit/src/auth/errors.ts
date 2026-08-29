/** Selected provider protocol has not been implemented yet. */
export class AuthAdapterNotImplementedError extends Error {
  constructor(path: string) {
    super(`${path} provider adapter is not implemented yet`);
    this.name = "AuthAdapterNotImplementedError";
  }
}

/** OAuth provider returned or PanGit detected a failed callback. */
export class OAuthCallbackError extends Error {
  readonly code: string;

  constructor(code: string, description?: string) {
    super(description === undefined ? `OAuth callback failed: ${code}` : description);
    this.name = "OAuthCallbackError";
    this.code = code;
  }
}
