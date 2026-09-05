import type { ForgejoRepositoryPayload } from "../native/ForgejoRepositoryNative.ts";
import { isForgejoRepositoryPayload } from "./validate-payload.ts";
import { normalizeForgejoRepository } from "./normalize-repository.ts";
import { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";

for (const version of ["15.0.7", "16.0.3"] as const) {
  Deno.test(`Forgejo ${version} accepts absent fork parents and retains native null`, async () => {
    const context = new ForgejoAdapterContext(version, {
      baseUrl: "https://forgejo.invalid/api/v1",
    });
    const raw = {
      id: 32,
      name: "project",
      full_name: "sandbox/project",
      parent: null,
      repo_transfer: null,
    } satisfies ForgejoRepositoryPayload<typeof version>;
    if (!isForgejoRepositoryPayload(raw)) throw new Error("real non-fork repository rejected");
    const normalized = normalizeForgejoRepository(context, await context.client(), raw);
    if (normalized.parent !== undefined) throw new Error("absent parent was fabricated");
    const native = await normalized.native.forgejo(({ repository }) => repository);
    if (native !== raw || native.parent !== null) throw new Error("native response changed");
    for (const parent of [false, {}, { name: "orphan" }]) {
      if (isForgejoRepositoryPayload({ ...raw, parent })) {
        throw new Error("malformed parent accepted");
      }
    }
    const fork = { ...raw, parent: { name: "source", owner: { login: "owner" } } };
    if (!isForgejoRepositoryPayload(fork)) throw new Error("valid fork rejected");
    const parent = normalizeForgejoRepository(context, await context.client(), fork).parent;
    if (parent?.fullName !== "owner/source") throw new Error("fork provenance lost");
  });
}
