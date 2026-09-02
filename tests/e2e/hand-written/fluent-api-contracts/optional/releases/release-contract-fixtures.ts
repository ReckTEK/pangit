/** Known tag and binary asset data used by the shared release lifecycle. */
export type ReleaseContractFixtures = {
  readonly repository: { readonly owner: string; readonly name: string };
  readonly tagName: string;
  readonly asset: {
    readonly name: string;
    readonly renamedName: string;
    readonly bytes: readonly number[];
  };
};
