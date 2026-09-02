/** Isolated repository and journal receiver used by the shared webhook lifecycle. */
export type RepositoryWebhookContractFixtures = {
  readonly repository: { readonly owner: string; readonly name: string };
  readonly branch: string;
  readonly receiver: {
    readonly targetUrl: string;
    clear(): Promise<void>;
    waitForEvent(
      event: string,
      timeoutMs: number,
    ): Promise<Readonly<{ event: string; body: unknown }>>;
  };
};
