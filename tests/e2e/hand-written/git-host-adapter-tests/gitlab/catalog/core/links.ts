import type { GitLabE2EFixtureDriver } from "../../GitLabE2EFixtureDriver.ts";

export const runCoreLinks = async (f: GitLabE2EFixtureDriver) => {
  const repo = await (await (await f.client()).container("root")).repository("e2e-links");
  const link = await repo.content.readSymlink("link.txt");
  f.equal(link.target, "target.txt", "Symlink target read as metadata");
  f.equal(link.dereferenced, undefined, "No implicit symlink dereference");
  const target = await repo.content.readSymlink("link.txt", { dereference: "internal" });
  f.equal(
    new TextDecoder().decode(target.dereferenced?.bytes),
    "symlink-target\n",
    "Explicit internal symlink resolves bytes",
  );
  await f.rejects(
    () => repo.content.readSymlink("escape.txt", { dereference: "internal" }),
    "CapabilityUnavailableError",
  );
  const sub = await repo.content.readSubmodule("vendor/internal", { dereference: "internal" });
  f.equal(sub.dereferenced?.kind, "directory", "Internal gitlink resolves pinned target");
  await f.rejects(
    () => repo.content.readSubmodule("vendor/external", { dereference: "internal" }),
    "CapabilityUnavailableError",
  );
};
