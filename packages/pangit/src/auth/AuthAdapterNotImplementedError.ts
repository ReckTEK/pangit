/** Selected provider protocol has not been implemented yet. */
export class AuthAdapterNotImplementedError extends Error {
  constructor(path: string) {
    super(`${path} provider adapter is not implemented yet`);
    this.name = "AuthAdapterNotImplementedError";
  }
}
