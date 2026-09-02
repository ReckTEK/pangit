/** Live credentials and disposable OAuth application prepared outside the fluent contract. */
export type AuthenticationContractFixtures = {
  readonly username: string;
  readonly password: string;
  readonly invalidSecret: string;
  readonly totp: {
    readonly username: string;
    readonly password: string;
    /** Return a fresh code that will not replay the enrollment timestep. */
    readonly nextOneTimePassword: () => Promise<string>;
  };
  readonly oauth: {
    readonly clientId: string;
    readonly clientSecret: string;
    readonly callbackUrl: string;
    readonly authorize: (authorizationUrl: URL) => Promise<string>;
  };
};
