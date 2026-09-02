/** Exact workflow/run/job/artifact identities resolved during bounded fixture setup. */
export type CiRunDiscoveryContractFixtures = {
  readonly repository: { readonly owner: string; readonly name: string };
  readonly workflow: {
    readonly id: string;
    readonly path: string;
  };
  readonly run: {
    readonly id: string;
    readonly branch: string;
    readonly sha: string;
    readonly status: "completed";
    readonly conclusion: "success";
  };
  readonly job: {
    readonly id: string;
    readonly status: "completed";
    readonly conclusion: "success";
  };
  readonly artifact: {
    readonly id: string;
    readonly name: string;
  };
  readonly missingArtifactName: string;
};
