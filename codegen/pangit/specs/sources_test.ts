import {
  apiSpecProviders,
  getApiSpecProviders,
  getApiSpecVersions,
  getVersionedRawApiSpecFileName,
} from "./sources.ts";
import { providerNormalizers } from "./normalizers/mod.ts";

Deno.test("every API specification source has one normalizer", () => {
  const sources = getApiSpecProviders();
  const normalizers = Object.keys(providerNormalizers).sort();

  if (JSON.stringify(sources) !== JSON.stringify(normalizers)) {
    throw new Error(
      `Normalizer providers ${JSON.stringify(normalizers)} do not match sources ${
        JSON.stringify(sources)
      }`,
    );
  }
});

Deno.test("versioned raw filenames preserve provider, version, and format", () => {
  for (const provider of getApiSpecProviders()) {
    for (const version of getApiSpecVersions(provider)) {
      const expected = `${provider}/${version}.${apiSpecProviders[provider].format}`;
      const actual = getVersionedRawApiSpecFileName(provider, version);
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, received ${actual}`);
      }
    }
  }
});

Deno.test("release sources use stable versions and immutable release refs", () => {
  for (const provider of getApiSpecProviders()) {
    const source = apiSpecProviders[provider];
    if (source.kind !== "release") continue;

    for (const version of getApiSpecVersions(provider)) {
      const release = source.versions[version];
      if (!/^\d+\.\d+\.\d+$/.test(version)) {
        throw new Error(`${provider} contains non-release version ${version}`);
      }
      if (release.ref === undefined || !release.url.includes(`/${release.ref}/`)) {
        throw new Error(`${provider} ${version} is not pinned to its release ref`);
      }
    }
  }
});

Deno.test("hosted sources track one live latest specification", () => {
  for (const provider of getApiSpecProviders()) {
    const source = apiSpecProviders[provider];
    if (source.kind !== "live") continue;

    const versions = getApiSpecVersions(provider);
    if (source.selected !== "latest" || JSON.stringify(versions) !== '["latest"]') {
      throw new Error(`${provider} does not track exactly one live latest specification`);
    }
  }
});
