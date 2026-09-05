import {
  type GeneratedOpenApiManifest,
  sha256,
} from "../../codegen/pangit/raw-rest-client-generation/openapi-specifications/download-openapi-specifications.ts";

const root = new URL("../../", import.meta.url);
const packageRoot = new URL("packages/pangit/", root);
const manifestFile = new URL(
  "codegen/pangit/raw-rest-client-generation/openapi-specifications/downloaded/generated-manifest.json",
  root,
);

Deno.test("package ships PanGit MIT license and complete generated schema notices", async () => {
  const rootLicense = await Deno.readTextFile(new URL("LICENSE", root));
  const packageLicense = await Deno.readTextFile(new URL("LICENSE", packageRoot));
  if (rootLicense !== packageLicense) throw new Error("Package LICENSE differs from root LICENSE");

  const rootNotices = await Deno.readTextFile(new URL("THIRD_PARTY_NOTICES.md", root));
  const packageNotices = await Deno.readTextFile(
    new URL("THIRD_PARTY_NOTICES.md", packageRoot),
  );
  if (rootNotices !== packageNotices) {
    throw new Error("Package third-party notices differ from generated root notices");
  }

  const configuration = JSON.parse(await Deno.readTextFile(new URL("deno.json", packageRoot)));
  const included = new Set(configuration.publish?.include);
  for (const required of ["LICENSE", "README.md", "THIRD_PARTY_NOTICES.md", "src"]) {
    if (!included.has(required)) throw new Error(`Package publish list omits ${required}`);
  }

  const manifest = JSON.parse(
    await Deno.readTextFile(manifestFile),
  ) as GeneratedOpenApiManifest;
  const providers = Object.keys(manifest.gitHosts).sort();
  const expectedProviders = [
    "azure-devops",
    "bitbucket",
    "codeberg",
    "forgejo",
    "gitea",
    "github",
    "gitlab",
  ];
  if (JSON.stringify(providers) !== JSON.stringify(expectedProviders)) {
    throw new Error(`Package contains unexpected providers: ${providers.join(", ")}`);
  }
  for (const [provider, host] of Object.entries(manifest.gitHosts)) {
    for (const [version, release] of Object.entries(host.versions)) {
      for (const required of [release.source, release.sha256]) {
        if (!rootNotices.includes(required)) {
          throw new Error(`Notices omit ${provider} ${version} source provenance: ${required}`);
        }
      }
      const clientModule = new URL(
        `src/generated-rest-clients/${provider}/${version}/mod.ts`,
        packageRoot,
      );
      const clientSource = await Deno.readTextFile(clientModule);
      if (release.license === null) {
        if (
          !rootNotices.includes("Schema license evidence: No separate license file is recorded.") ||
          !clientSource.includes("// Schema license: no separate license evidence recorded")
        ) {
          throw new Error(`${provider} ${version} missing transparent license status`);
        }
        continue;
      }
      for (
        const required of [
          release.license.text.source,
          release.license.text.sha256,
          release.license.attribution,
        ]
      ) {
        if (!rootNotices.includes(required)) {
          throw new Error(`Notices omit ${provider} ${version} provenance: ${required}`);
        }
      }
      if (release.license.declaration !== null) {
        if (
          !rootNotices.includes(release.license.declaration.name) ||
          !rootNotices.includes(release.license.declaration.url)
        ) {
          throw new Error(`Notices omit ${provider} ${version} embedded license declaration`);
        }
      }
      for (const artifact of [release.license.text, ...release.license.notices]) {
        const body = await Deno.readTextFile(new URL(artifact.destination, root));
        const distributedBody = artifact === release.license.text
          ? body.replace(
            "Copyright (c) <year> <copyright holders>",
            release.license.attribution,
          )
          : body;
        if (
          await sha256(body) !== artifact.sha256 ||
          !rootNotices.includes(distributedBody.trimEnd()) ||
          (distributedBody !== body &&
            !rootNotices.includes(await sha256(distributedBody.trimEnd())))
        ) {
          throw new Error(`Notices omit verified ${provider} ${version} license evidence`);
        }
      }

      if (
        !clientSource.includes(`// OpenAPI source: ${release.source}`) ||
        !clientSource.includes(`// Schema license: MIT (${release.license.text.source})`) ||
        !clientSource.includes(`// Downloaded license SHA-256: ${release.license.text.sha256}`) ||
        !clientSource.includes("// Full license text and notices: THIRD_PARTY_NOTICES.md")
      ) {
        throw new Error(`${provider} ${version} generated client lacks license provenance`);
      }
    }
  }
});
