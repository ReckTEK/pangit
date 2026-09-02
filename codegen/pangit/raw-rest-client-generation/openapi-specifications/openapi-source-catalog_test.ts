import {
  getDownloadedOpenApiFileName,
  getGitHostApiVersions,
  getGitHosts,
  gitHostOpenApiSources,
} from "./openapi-source-catalog.ts";
import { gitHostNormalizers } from "./normalizers/normalize-all-openapi-specifications.ts";

Deno.test("every API specification source has one normalizer", () => {
  const sources = getGitHosts();
  const normalizers = Object.keys(gitHostNormalizers).sort();

  if (JSON.stringify(sources) !== JSON.stringify(normalizers)) {
    throw new Error(
      `Normalizer Git hosts ${JSON.stringify(normalizers)} do not match sources ${
        JSON.stringify(sources)
      }`,
    );
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
