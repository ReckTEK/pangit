/** OAuth provider returned or PanGit detected a failed callback. */
export class OAuthCallbackError extends Error {
  readonly code: string;

  constructor(code: string, description?: string) {
    super(description === undefined ? `OAuth callback failed: ${code}` : description);
    this.name = "OAuthCallbackError";
    this.code = code;
  }
}
