/** One disposable package with two known versions and one expected file. */
export type PackageContractFixtures = {
  readonly coordinates: {
    readonly owner: string;
    readonly type: string;
    readonly name: string;
  };
  readonly readVersion: string;
  readonly deleteVersion: string;
  readonly missingVersion: string;
  readonly file: {
    readonly name: string;
    readonly size: number;
  };
};
