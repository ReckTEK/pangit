import { unwrapRestResponse } from "../../../../../../packages/pangit/src/generated-rest-clients/runtime/mod.ts";
import type { ForgejoClient, ForgejoRepositoryFixture, ForgejoVersion } from "./types.ts";
import { requiredString } from "./values.ts";
export async function createFork<TVersion extends ForgejoVersion>(
  client: ForgejoClient<TVersion>,
  timeoutMs: number,
  trackRepository: (owner: string, name: string) => void,
  source: Pick<ForgejoRepositoryFixture, "owner" | "name">,
  destinationOrganization: string,
  name: string,
): Promise<void> {
  const organization = requiredString(destinationOrganization, "fork organization");
  const forkName = requiredString(name, "fork name");
  unwrapRestResponse(
    await client.createFork({
      path: { owner: source.owner, repo: source.name },
      body: {
        mediaType: "application/json",
        value: { organization, name: forkName },
      },
    }, { signal: AbortSignal.timeout(timeoutMs) }),
  );
  trackRepository(organization, forkName);
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const result = await client.repoGet(
      { path: { owner: organization, repo: forkName } },
      { signal: AbortSignal.timeout(timeoutMs) },
    );
    if (result.ok) return;
    if (result.status !== 404) unwrapRestResponse(result);
    if (Date.now() >= deadline) {
      throw new Error(`Forgejo fixture fork ${organization}/${forkName} timed out`);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
