import {
  getDownloadedOpenApiFileName,
  getGitHostApiVersions,
  getGitHosts,
  gitHostOpenApiSources,
} from "./openapi-source-catalog.ts";
import { gitHostNormalizers } from "./normalizers/normalize-all-openapi-specifications.ts";

Deno.test("every active API specification source has a normalizer", () => {
  const sources = getGitHosts();
  for (const source of sources) {
    if (!(source in gitHostNormalizers)) {
      throw new Error(`Active Git host ${source} has no normalizer`);
    }
  }
});

Deno.test("every supported source is active and content-pinned", () => {
  const expected = [
    "azure-devops",
    "bitbucket",
    "codeberg",
    "forgejo",
    "gitea",
    "github",
    "gitlab",
  ];
  const actual = getGitHosts();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }

  for (const gitHost of actual) {
    for (const version of getGitHostApiVersions(gitHost)) {
      const specification = gitHostOpenApiSources[gitHost].versions[version];
      if (!/^sha256:[a-f0-9]{64}$/.test(specification.expectedSha256)) {
        throw new Error(`${gitHost} ${version} specification is not pinned`);
      }
      const license = specification.license;
      if (license === undefined) continue;
      if (license.spdx !== "MIT") throw new Error(`${gitHost} ${version} license is not MIT`);
      if (new URL(license.url).protocol !== "https:") {
        throw new Error(`${gitHost} ${version} license URL is not HTTPS`);
      }
      if (license.attribution.trim().length === 0) {
        throw new Error(`${gitHost} ${version} has no attribution`);
      }
      if (!/^sha256:[a-f0-9]{64}$/.test(license.expectedSha256)) {
        throw new Error(`${gitHost} ${version} license text is not pinned`);
      }
      for (const notice of license.notices ?? []) {
        if (new URL(notice.url).protocol !== "https:") {
          throw new Error(`${gitHost} ${version} notice URL is not HTTPS`);
        }
        if (!/^sha256:[a-f0-9]{64}$/.test(notice.expectedSha256)) {
          throw new Error(`${gitHost} ${version} notice is not pinned`);
        }
      }
    }
  }
});

Deno.test("GitHub specification and license are pinned to the audited commit", () => {
  const source = gitHostOpenApiSources.github.versions.latest;
  if (source.license === undefined) throw new Error("GitHub license evidence is missing");
  const commit = "085fb86b030e75ae7ba65a2523f8729fdcae19d4";
  if (!source.url.includes(`/${commit}/`) || !source.license.url.includes(`/${commit}/`)) {
    throw new Error("GitHub specification and license do not use the audited commit");
  }
});

Deno.test("Codeberg records its MIT interoperability evidence", () => {
  const source = gitHostOpenApiSources.codeberg.versions.latest;
  if (source.license === undefined) throw new Error("Codeberg license evidence is missing");
  const evidence =
    "https://codeberg.org/forgejo/forgejo/commit/5e923cfbddb59eb7afaed1bc3b5724c1b2bc0844.patch";
  if (source.license.url !== "https://spdx.org/licenses/MIT.txt") {
    throw new Error("Codeberg does not use the canonical MIT license text");
  }
  if (!source.license.notices?.some((notice) => notice.url === evidence)) {
    throw new Error("Codeberg MIT interoperability evidence is missing");
  }
  if (
    source.license.declaration?.name !==
      "This file is distributed under the MIT license for the purpose of interoperability" ||
    source.license.declaration.url !== "http://opensource.org/licenses/MIT"
  ) {
    throw new Error("Codeberg embedded MIT declaration is not pinned");
  }
});

Deno.test("downloaded OpenAPI filenames preserve Git host, version, and format", () => {
  for (const gitHost of getGitHosts()) {
    for (const version of getGitHostApiVersions(gitHost)) {
      const expected = `${gitHost}/${version}.${gitHostOpenApiSources[gitHost].format}`;
      const actual = getDownloadedOpenApiFileName(gitHost, version);
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, received ${actual}`);
      }
    }
  }
});

Deno.test("release sources use stable versions and immutable release refs", () => {
  for (const gitHost of getGitHosts()) {
    const source = gitHostOpenApiSources[gitHost];
    if (source.kind !== "release") continue;

    for (const version of getGitHostApiVersions(gitHost)) {
      const release = source.versions[version];
      if (!/^\d+\.\d+\.\d+$/.test(version)) {
        throw new Error(`${gitHost} contains non-release version ${version}`);
      }
      if (release.ref === undefined || !release.url.includes(`/${release.ref}/`)) {
        throw new Error(`${gitHost} ${version} is not pinned to its release ref`);
      }
      if (
        release.license !== undefined && !release.license.url.includes(`/${release.ref}/`) &&
        !(release.license.url === "https://spdx.org/licenses/MIT.txt" &&
          release.license.declaration)
      ) {
        throw new Error(`${gitHost} ${version} license is not pinned to its release ref`);
      }
    }
  }
});

Deno.test("hosted sources track one live latest specification", () => {
  for (const gitHost of getGitHosts()) {
    const source = gitHostOpenApiSources[gitHost];
    if (source.kind !== "live") continue;

    const versions = getGitHostApiVersions(gitHost);
    if (source.selected !== "latest" || JSON.stringify(versions) !== '["latest"]') {
      throw new Error(`${gitHost} does not track exactly one live latest specification`);
    }
  }
});
