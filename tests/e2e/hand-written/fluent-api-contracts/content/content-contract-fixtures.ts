/** Provider-created file tree needed by content-read and file-change contracts. */
export type ContentContractFixtures = {
  readonly repository: { readonly owner: string; readonly name: string };
  readonly ref: string;
  readonly branch: string;
  readonly parentRef: string;
  readonly text: { readonly path: string; readonly value: string };
  readonly binary: { readonly path: string; readonly value: readonly number[] };
  readonly emptyPath: string;
  readonly unicodePath: string;
  readonly unicodeValue: string;
  readonly json: { readonly path: string; readonly value: unknown };
  readonly invalidJsonPath: string;
  readonly image: {
    readonly path: string;
    readonly extensionlessPath: string;
    readonly bytes: readonly number[];
  };
  readonly unknownBinaryPath: string;
  readonly nestedDirectory: string;
  readonly nestedPath: string;
  readonly deepPath: string;
  readonly chainDirectory: string;
  readonly linkedContent: {
    readonly repository: { readonly owner: string; readonly name: string };
    readonly ref: string;
    readonly symlinkPath: string;
    readonly symlinkTarget: string;
    readonly symlinkTargetValue: string;
    readonly internalSubmodulePath: string;
    readonly internalSubmoduleUrl: string;
    readonly submodulePath: string;
    readonly submoduleUrl: string;
    readonly submoduleSha: string;
  };
};

export type FileChangeContractFixtures = {
  readonly repository: { readonly owner: string; readonly name: string };
  readonly branch: string;
  readonly originalHeadSha: string;
  readonly updatePath: string;
  readonly deletePath: string;
  readonly movePath: string;
  readonly createdPath: string;
  readonly movedPath: string;
  readonly newBranch: string;
};
