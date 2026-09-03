import {
  applyOpenApiTransform,
  assertMitLicenseText,
  assertOpenApiDocument,
  assertOpenApiLicenseDeclaration,
  downloadOpenApiSpecifications,
  type GeneratedOpenApiManifest,
  reuseDownloadedOpenApiSpecifications,
  sha256,
} from "./download-openapi-specifications.ts";
import {
  getDownloadedOpenApiFileName,
  getGitHostApiVersions,
  getGitHosts,
  gitHostOpenApiSources,
  type OpenApiVersionSource,
} from "./openapi-source-catalog.ts";
import { workspace } from "../../../workspace-layout.ts";

const downloadedDestination =
  "codegen/pangit/raw-rest-client-generation/openapi-specifications/downloaded/";
const checkedInDownloads = new URL("./downloaded/", import.meta.url);
const fixtureSha256 = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const mitLicense = `MIT License

Copyright (c) Fixture

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
`;

function fixtureSource(transform?: "gitea-template"): OpenApiVersionSource {
  return {
    url: "https://example.invalid/spec",
    expectedSha256: fixtureSha256,
    transform,
    license: {
      spdx: "MIT",
      url: "https://example.invalid/LICENSE",
      expectedSha256: fixtureSha256,
      attribution: "Copyright (c) Fixture",
    },
  };
}

Deno.test("Gitea release templates become concrete specifications", () => {
  const transformed = applyOpenApiTransform(
    '{"swagger":"2.0","version":"{{.SwaggerAppVer}}","basePath":"{{.SwaggerAppSubUrl}}/api/v1"}',
    fixtureSource("gitea-template"),
    "1.26.4",
  );
  const expected = '{"swagger":"2.0","version":"1.26.4","basePath":"/api/v1"}';
  if (transformed !== expected) {
    throw new Error(`Expected ${expected}, received ${transformed}`);
  }
  assertOpenApiDocument(transformed, "json", "test Gitea specification");
});

Deno.test("unresolved source templates are rejected", () => {
  try {
    applyOpenApiTransform(
      '{"openapi":"3.0.0","title":"{{.Unknown}}"}',
      fixtureSource("gitea-template"),
      "latest",
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("unresolved template")) return;
    throw error;
  }
  throw new Error("Expected unresolved template expression to be rejected");
});

Deno.test("license downloads must contain recognizable MIT text", () => {
  assertMitLicenseText(mitLicense, "fixture license");
  try {
    assertMitLicenseText("not a license", "fixture license");
  } catch (error) {
    if (error instanceof Error && error.message.includes("not recognizable MIT")) return;
    throw error;
  }
  throw new Error("Expected invalid MIT text to be rejected");
});

Deno.test("reviewed embedded schema license declarations must match exactly", () => {
  const declaration = {
    name: "This file is distributed under the MIT license",
    url: "https://opensource.org/licenses/MIT",
  };
  const document = JSON.stringify({ openapi: "3.0.3", info: { license: declaration } });
  assertOpenApiLicenseDeclaration(document, "json", declaration, "fixture specification");
  try {
    assertOpenApiLicenseDeclaration(
      JSON.stringify({ openapi: "3.0.3", info: { license: { name: "changed" } } }),
      "json",
      declaration,
      "fixture specification",
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("does not match")) return;
    throw error;
  }
  throw new Error("Expected a changed embedded license declaration to be rejected");
});

Deno.test("raw specification hashes use SHA-256", async () => {
  const actual = await sha256("abc");
  const expected = "sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
  if (actual !== expected) {
    throw new Error(`Expected ${expected}, received ${actual}`);
  }
});

Deno.test("downloads every configured source and manifests its checked-in artifact", async () => {
  const directory = await Deno.makeTempDir({ dir: "codegen", prefix: ".raw-test-" });
  const root = new URL(`${directory}/`, workspace.root);
  const requested: string[] = [];
  try {
    await downloadOpenApiSpecifications(mockFetcher(requested), root);
    assertEqual(requested.sort(), expectedSourceUrls());

    const manifest: GeneratedOpenApiManifest = JSON.parse(
      await Deno.readTextFile(new URL("generated-manifest.json", root)),
    );
    assertEqual(Object.keys(manifest.gitHosts).sort(), getGitHosts());
    for (const [gitHost, hostManifest] of Object.entries(manifest.gitHosts)) {
      for (const [version, release] of Object.entries(hostManifest.versions)) {
        assertEqual(
          release.artifacts.client,
          `src/generated-rest-clients/${gitHost}/${version}/mod.ts`,
        );
        if (
          "tests" in release.artifacts || "results" in release.artifacts ||
          "compose" in release.artifacts
        ) {
          throw new Error("API specification artifacts still mix in live-E2E paths");
        }

        const catalogLicense = gitHostOpenApiSources[gitHost as keyof typeof gitHostOpenApiSources]
          .versions[version].license;
        if (catalogLicense === undefined) {
          assertEqual(release.license, null);
          continue;
        }
        if (release.license === null) {
          throw new Error(`${gitHost} ${version} lost configured license evidence`);
        }
        assertEqual(release.license.spdx, "MIT");
        assertEqual(release.license.attribution, catalogLicense.attribution);
        assertEqual(release.license.text.source, catalogLicense.url);
        assertEqual(
          release.license.notices.map((notice) => notice.source),
          (catalogLicense.notices ?? []).map((notice) => notice.url),
        );
        assertEqual(release.license.declaration, catalogLicense.declaration ?? null);

        await assertManifestTextArtifact(
          root,
          release.license.text,
          await readCheckedInSource(release.license.text.source),
        );
        for (const notice of release.license.notices) {
          await assertManifestTextArtifact(
            root,
            notice,
            await readCheckedInSource(notice.source),
          );
        }
      }
    }
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("cached regeneration is deterministic and removes inactive provider files", async () => {
  const directory = await Deno.makeTempDir({ dir: "codegen", prefix: ".raw-test-" });
  const root = new URL(`${directory}/`, workspace.root);
  try {
    await downloadOpenApiSpecifications(mockFetcher(), root);
    const previous = await Deno.readTextFile(new URL("generated-manifest.json", root));
    const staleSpec = new URL("retired-provider/latest.yaml", root);
    const staleLicense = new URL("licenses/retired-provider/latest/LICENSE.txt", root);
    await Deno.mkdir(new URL("./", staleSpec), { recursive: true });
    await Deno.mkdir(new URL("./", staleLicense), { recursive: true });
    await Deno.writeTextFile(staleSpec, "stale");
    await Deno.writeTextFile(staleLicense, "stale");

    await reuseDownloadedOpenApiSpecifications(root);

    if (await Deno.readTextFile(new URL("generated-manifest.json", root)) !== previous) {
      throw new Error("Cached generation changed the source manifest");
    }
    if (await exists(staleSpec) || await exists(staleLicense)) {
      throw new Error("Cached generation preserved inactive provider files");
    }
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("changed cached specification is blocked by its reviewed hash", async () => {
  const directory = await Deno.makeTempDir({ dir: "codegen", prefix: ".raw-test-" });
  const root = new URL(`${directory}/`, workspace.root);
  const manifestFile = new URL("generated-manifest.json", root);
  try {
    await downloadOpenApiSpecifications(mockFetcher(), root);
    const previous = await Deno.readTextFile(manifestFile);
    const manifest: GeneratedOpenApiManifest = JSON.parse(previous);
    const release = manifest.gitHosts.gitea.versions["1.26.4"];
    if (release.license === null) throw new Error("Gitea license evidence is missing");
    const specificationFile = resolveDownloadedDestination(root, release.destination);
    const specification = JSON.parse(await Deno.readTextFile(specificationFile));
    specification["x-pangit-test-change"] = true;
    await Deno.writeTextFile(specificationFile, JSON.stringify(specification));

    await assertRejects(
      () => reuseDownloadedOpenApiSpecifications(root),
      "specification hash changed",
    );
    if (await Deno.readTextFile(manifestFile) !== previous) {
      throw new Error("Invalid cached specification replaced the source manifest");
    }
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("changed cached license is blocked by its reviewed hash", async () => {
  const directory = await Deno.makeTempDir({ dir: "codegen", prefix: ".raw-test-" });
  const root = new URL(`${directory}/`, workspace.root);
  const manifestFile = new URL("generated-manifest.json", root);
  try {
    await downloadOpenApiSpecifications(mockFetcher(), root);
    const previous = await Deno.readTextFile(manifestFile);
    const manifest: GeneratedOpenApiManifest = JSON.parse(previous);
    const release = manifest.gitHosts.gitea.versions["1.26.4"];
    if (release.license === null) throw new Error("Gitea license evidence is missing");
    const licenseFile = resolveDownloadedDestination(root, release.license.text.destination);
    await Deno.writeTextFile(licenseFile, `${await Deno.readTextFile(licenseFile)}\n`);

    await assertRejects(() => reuseDownloadedOpenApiSpecifications(root), "license hash changed");
    if (await Deno.readTextFile(manifestFile) !== previous) {
      throw new Error("Invalid cached license replaced the source manifest");
    }
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("failed downloads preserve the entire existing directory", async () => {
  const directory = await Deno.makeTempDir({ dir: "codegen", prefix: ".raw-test-" });
  const root = new URL(`${directory}/`, workspace.root);
  const marker = new URL("existing.txt", root);
  try {
    await Deno.writeTextFile(marker, "preserve me");
    await assertRejects(() =>
      downloadOpenApiSpecifications(
        () => Promise.resolve(new Response("failed", { status: 503, statusText: "Unavailable" })),
        root,
      )
    );
    assertEqual(await Deno.readTextFile(marker), "preserve me");
    assertEqual((await Array.fromAsync(Deno.readDir(root))).map((entry) => entry.name), [
      "existing.txt",
    ]);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

function mockFetcher(requested: string[] = []): typeof fetch {
  return (async (input) => {
    const url = input instanceof Request ? input.url : input.toString();
    requested.push(url);
    try {
      return new Response(await readCheckedInSource(url));
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
      return new Response("Not found", { status: 404 });
    }
  }) as typeof fetch;
}

function expectedSourceUrls(): string[] {
  return getGitHosts().flatMap((gitHost) =>
    getGitHostApiVersions(gitHost).flatMap((version) => {
      const source = gitHostOpenApiSources[gitHost].versions[version];
      return source.license === undefined ? [source.url] : [
        source.url,
        source.license.url,
        ...(source.license.notices ?? []).map((notice) => notice.url),
      ];
    })
  ).sort();
}

async function readCheckedInSource(sourceUrl: string): Promise<string> {
  for (const gitHost of getGitHosts()) {
    for (const version of getGitHostApiVersions(gitHost)) {
      const source = gitHostOpenApiSources[gitHost].versions[version];
      if (source.url === sourceUrl) {
        return await Deno.readTextFile(
          new URL(getDownloadedOpenApiFileName(gitHost, version), checkedInDownloads),
        );
      }
      if (source.license?.url === sourceUrl) {
        return await Deno.readTextFile(
          new URL(`licenses/${gitHost}/${version}/LICENSE.txt`, checkedInDownloads),
        );
      }
      const noticeIndex = (source.license?.notices ?? []).findIndex((notice) =>
        notice.url === sourceUrl
      );
      if (noticeIndex >= 0) {
        return await Deno.readTextFile(
          new URL(
            `licenses/${gitHost}/${version}/NOTICE-${String(noticeIndex + 1).padStart(2, "0")}.txt`,
            checkedInDownloads,
          ),
        );
      }
    }
  }
  throw new Deno.errors.NotFound(sourceUrl);
}

async function assertManifestTextArtifact(
  root: URL,
  artifact: { destination: string; bytes: number; sha256: string },
  expected: string,
): Promise<void> {
  const relative = artifact.destination.slice(downloadedDestination.length);
  if (!artifact.destination.startsWith(downloadedDestination) || relative.includes("..")) {
    throw new Error(`Unsafe legal artifact destination ${artifact.destination}`);
  }
  const body = await Deno.readTextFile(new URL(relative, root));
  assertEqual(body, expected);
  assertEqual(artifact.bytes, new TextEncoder().encode(body).byteLength);
  assertEqual(artifact.sha256, await sha256(body));
}

function resolveDownloadedDestination(root: URL, destination: string): URL {
  if (!destination.startsWith(downloadedDestination)) {
    throw new Error(`Unexpected downloaded destination ${destination}`);
  }
  return new URL(destination.slice(downloadedDestination.length), root);
}

async function exists(path: URL): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

async function assertRejects(action: () => Promise<unknown>, message?: string): Promise<void> {
  try {
    await action();
  } catch (error) {
    if (message !== undefined && (!(error instanceof Error) || !error.message.includes(message))) {
      throw error;
    }
    return;
  }
  throw new Error("Expected action to reject");
}

function assertEqual(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}
