/** Direct identities and bytes prepared outside the fluent blob-read contract. */
export type BlobReadContractFixtures = {
  readonly repository: { readonly owner: string; readonly name: string };
  readonly blob: {
    readonly sha: string;
    readonly bytes: Uint8Array;
  };
  readonly missingSha: string;
};
