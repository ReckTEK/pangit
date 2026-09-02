import { ProviderInvariantError } from "../../../fluent-api/adapter-contract/errors.ts";
import { GiteaAdapterContext } from "../GiteaAdapterContext.ts";
import {
  deleteGiteaPackage,
  deleteGiteaPackageVersion,
  findGiteaPackageVersion,
  getGiteaPackageVersion,
  listGiteaPackageFiles,
  listGiteaPackages,
  listGiteaPackageVersions,
} from "./packages.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  }
}

async function assertRejects(
  execute: () => unknown | Promise<unknown>,
  errorType: new (...args: never[]) => Error,
): Promise<void> {
  try {
    await execute();
  } catch (error) {
    assert(error instanceof errorType, `Expected ${errorType.name}, received ${String(error)}`);
    return;
  }
  throw new Error(`Expected ${errorType.name}`);
}

const coordinates = { owner: "acme", type: "generic", name: "fixture" } as const;
const identity = { ...coordinates, version: "1.0.0" } as const;
const packagePayload = {
  id: 51,
  name: "fixture",
  type: "generic",
  version: "1.0.0",
  created_at: "2026-01-01T00:00:00Z",
  owner: { login: "acme" },
  creator: { login: "fixture-user" },
  repository: { full_name: "acme/demo" },
  html_url: "https://gitea.example.invalid/acme/-/packages/generic/fixture/1.0.0",
};
const packageFile = {
  id: 61,
  name: "fixture.tar.gz",
  size: 128,
  sha256: "abcd",
};

Deno.test("Gitea package metadata uses direct identities and one requested provider page", async () => {
  const requests: Request[] = [];
  const context = new GiteaAdapterContext("1.27.2", {
    baseUrl: "https://gitea.example.invalid/api/v1",
    fetch: (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      const path = new URL(request.url).pathname;
      if (request.method === "DELETE") return Promise.resolve(new Response(null, { status: 204 }));
      if (path.endsWith("/missing")) return Promise.resolve(new Response(null, { status: 404 }));
      if (path.endsWith("/files")) return Promise.resolve(Response.json([packageFile]));
      if (path.endsWith("/generic/fixture/1.0.0")) {
        return Promise.resolve(Response.json(packagePayload));
      }
      if (path.endsWith("/generic/fixture")) {
        return Promise.resolve(Response.json([packagePayload], {
          headers: { "x-total-count": "3", "x-perpage": "1", "x-page": "1" },
        }));
      }
      if (path.endsWith("/packages/acme")) {
        return Promise.resolve(Response.json([packagePayload], {
          headers: { "x-total-count": "3", "x-perpage": "1", "x-page": "1" },
        }));
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    },
  });

  const packages = await listGiteaPackages(context, "acme", {
    limit: 2,
    query: "fixture",
    type: "generic",
  });
  const versions = await listGiteaPackageVersions(context, coordinates, { limit: 2 });
  const fetched = await getGiteaPackageVersion(context, identity);
  const missing = await findGiteaPackageVersion(context, { ...identity, version: "missing" });
  const files = await listGiteaPackageFiles(context, identity, { maxFiles: 2 });
  await deleteGiteaPackageVersion(context, identity);
  await deleteGiteaPackage(context, coordinates);

  assertEquals(requests.length, 7, "package lifecycle request count changed");
  assertEquals(packages.nextCursor, "gitea-page:2:1", "package page continuation changed");
  assertEquals(versions.nextCursor, "gitea-page:2:1", "version page continuation changed");
  assertEquals(fetched.repositoryFullName, "acme/demo", "package repository metadata changed");
  assertEquals(missing, undefined, "confirmed missing package did not become absence");
  assertEquals(files[0].digests.sha256, "abcd", "package-file digest changed");
  assert(Object.isFrozen(files), "package-file result is mutable");
  assert(Object.isFrozen(files[0].digests), "package-file digests are mutable");
  const nativeName = await fetched.native.gitea(({ package: value }) => value.name);
  assertEquals(nativeName, "fixture", "package native payload changed");

  const listUrl = new URL(requests[0].url);
  assertEquals(listUrl.searchParams.get("page"), "1", "package list page changed");
  assertEquals(listUrl.searchParams.get("limit"), "2", "package list limit changed");
  assertEquals(listUrl.searchParams.get("q"), "fixture", "package query changed");
  assertEquals(listUrl.searchParams.get("type"), "generic", "package type filter changed");
});

Deno.test("Gitea packages reject invalid types locally and enforce explicit file bounds", async () => {
  let requests = 0;
  const context = new GiteaAdapterContext("1.27.2", {
    baseUrl: "https://gitea.example.invalid/api/v1",
    fetch: () => {
      requests++;
      return Promise.resolve(Response.json([packageFile, { ...packageFile, id: 62 }]));
    },
  });
  await assertRejects(
    () => listGiteaPackages(context, "acme", { limit: 1, type: "made-up" }),
    TypeError,
  );
  assertEquals(requests, 0, "invalid package type reached Gitea");
  await assertRejects(
    () => listGiteaPackageFiles(context, identity, { maxFiles: 1 }),
    ProviderInvariantError,
  );
  assertEquals(requests, 1, "bounded package-file read made an unexpected request count");
});
