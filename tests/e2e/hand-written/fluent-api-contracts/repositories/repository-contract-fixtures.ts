/** Live identities needed by the universal container and repository lifecycle contract. */
export type RepositoryContractFixtures = {
  readonly user: { readonly name: string; readonly repository: string };
  readonly organization: { readonly name: string; readonly repository: string };
  readonly mutationRepository: string;
  readonly initializedRepository: string;
  readonly organizationMutationRepository: string;
};
