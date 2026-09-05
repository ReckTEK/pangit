export interface ForgejoNativeEntityAccessFixtures {
  readonly repository: {
    readonly owner: string;
    readonly name: string;
    readonly branch: string;
    readonly tag: string;
    readonly commitSha: string;
    readonly contentPath: string;
    readonly pullRequestNumber: number;
  };
  readonly reviewer: { readonly username: string; readonly password: string };
}
