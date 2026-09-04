import type { WorkspacePaths } from "../workspace-layout.ts";
import { generateLicenseArtifacts, renderThirdPartyNotices } from "./generate-license-artifacts.ts";
import { mediaTypeSource } from "./media-type-generation/generate-media-types.ts";
import {
  type GeneratedOpenApiManifest,
  sha256,
} from "./raw-rest-client-generation/openapi-specifications/download-openapi-specifications.ts";

const fixtureLicense = `MIT License

Copyright (c) Fixture

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
`;

const fixtureNotice = `Subject: Explicit schema license clarification

The schema is licensed under MIT for interoperability.

\`\`\`diff
+license = "MIT"
\`\`\`
`;

Deno.test("license artifacts preserve verified upstream license and notice bodies", async () => {
  const directory = await Deno.makeTempDir({ dir: Deno.cwd(), prefix: ".license-artifacts-" });
  const root = new URL(`file://${directory}/`);
  const packageRoot = new URL("packages/pangit/", root);
  const licenseDestination =
    "codegen/pangit/raw-rest-client-generation/openapi-specifications/downloaded/licenses/example/latest/LICENSE.txt";
  const noticeDestination =
    "codegen/pangit/raw-rest-client-generation/openapi-specifications/downloaded/licenses/example/latest/NOTICE-01.txt";
  const manifestDestination =
    "codegen/pangit/raw-rest-client-generation/openapi-specifications/downloaded/generated-manifest.json";
  const licenseSha256 = await sha256(fixtureLicense);
  const noticeSha256 = await sha256(fixtureNotice);
  const manifest: GeneratedOpenApiManifest = {
    schemaVersion: 1,
    gitHosts: {
      example: {
        name: "Example",
        kind: "live",
        upstream: "https://example.invalid",
        selected: "latest",
        client: {
          className: "ExampleRestClient",
          displayName: "Example",
          namespaceName: "ExampleApi",
          variablePrefix: "example",
        },
        versions: {
          latest: {
            ref: null,
            source: "https://example.invalid/openapi.json",
            format: "json",
            destination:
              "codegen/pangit/raw-rest-client-generation/openapi-specifications/downloaded/example/latest.json",
            bytes: 1,
            sha256: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            license: {
              spdx: "MIT",
              attribution: "Copyright (c) Fixture",
              declaration: {
                name: "This schema is distributed under the MIT license",
                url: "https://opensource.org/licenses/MIT",
              },
              text: {
                source: "https://example.invalid/LICENSE",
                destination: licenseDestination,
                bytes: new TextEncoder().encode(fixtureLicense).byteLength,
                sha256: licenseSha256,
              },
              notices: [{
                source: "https://example.invalid/license-clarification.patch",
                destination: noticeDestination,
                bytes: new TextEncoder().encode(fixtureNotice).byteLength,
                sha256: noticeSha256,
              }],
            },
            artifacts: {
              normalized:
                "codegen/pangit/raw-rest-client-generation/openapi-specifications/normalized/example/latest.json",
              client: "src/generated-rest-clients/example/latest/mod.ts",
              documentation: {
                openapi: "app/documentation/generated/example/latest/openapi.json",
                operations: "app/documentation/generated/example/latest/operations.json",
                route: "/docs/raw/example/latest",
              },
            },
          },
        },
      },
    },
  };
  const paths: WorkspacePaths = {
    root,
    codegen: {
      root: new URL("codegen/", root),
      pangit: new URL("codegen/pangit/", root),
      pangitSite: new URL("codegen/pangit-site/", root),
    },
    packages: { pangit: packageRoot, site: new URL("packages/pangit-site/", root) },
  };

  try {
    await copyMediaTypeInputs(root);
    await Deno.mkdir(new URL("./", new URL(licenseDestination, root)), { recursive: true });
    await Deno.mkdir(new URL("./", new URL(manifestDestination, root)), { recursive: true });
    await Deno.mkdir(packageRoot, { recursive: true });
    await Deno.writeTextFile(new URL("LICENSE", root), fixtureLicense);
    await Deno.writeTextFile(new URL(licenseDestination, root), fixtureLicense);
    await Deno.writeTextFile(new URL(noticeDestination, root), fixtureNotice);
    await Deno.writeTextFile(new URL(manifestDestination, root), JSON.stringify(manifest));

    await generateLicenseArtifacts(paths);
    const notices = await Deno.readTextFile(new URL("THIRD_PARTY_NOTICES.md", root));
    if (
      !notices.includes("## Example latest") || !notices.includes(licenseSha256) ||
      !notices.includes(fixtureLicense.trimEnd()) || !notices.includes(noticeSha256) ||
      !notices.includes(fixtureNotice.trimEnd()) ||
      !notices.includes("This schema is distributed under the MIT license") ||
      !notices.includes(`mime-db ${mediaTypeSource.version}`) ||
      !notices.includes(mediaTypeSource.database.sha256) ||
      !notices.includes(mediaTypeSource.license.sha256)
    ) {
      throw new Error("Generated notices omit provenance or a full verified upstream body");
    }
    if (
      await Deno.readTextFile(new URL("THIRD_PARTY_NOTICES.md", packageRoot)) !== notices ||
      await Deno.readTextFile(new URL("LICENSE", packageRoot)) !== fixtureLicense
    ) {
      throw new Error("Package license artifacts do not match repository sources");
    }
    if (await renderThirdPartyNotices(manifest, root) !== notices) {
      throw new Error("Third-party notice rendering is not deterministic");
    }
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("license artifacts complete canonical MIT template placeholders", async () => {
  const template = fixtureLicense.replace(
    "Copyright (c) Fixture",
    "Copyright (c) <year> <copyright holders>",
  );
  const directory = await Deno.makeTempDir({ dir: Deno.cwd(), prefix: ".license-template-" });
  const root = new URL(`file://${directory}/`);
  const destination =
    "codegen/pangit/raw-rest-client-generation/openapi-specifications/downloaded/licenses/example/latest/LICENSE.txt";
  try {
    await copyMediaTypeInputs(root);
    await Deno.mkdir(new URL("./", new URL(destination, root)), { recursive: true });
    await Deno.writeTextFile(new URL(destination, root), template);
    const manifest = {
      schemaVersion: 1,
      gitHosts: {
        example: {
          name: "Example",
          versions: {
            latest: {
              source: "https://example.invalid/openapi.json",
              sha256: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              license: {
                spdx: "MIT",
                attribution: "Copyright (c) Example contributors",
                declaration: null,
                text: {
                  source: "https://spdx.org/licenses/MIT.txt",
                  destination,
                  bytes: new TextEncoder().encode(template).byteLength,
                  sha256: await sha256(template),
                },
                notices: [],
              },
            },
          },
        },
      },
    } as unknown as GeneratedOpenApiManifest;

    const notices = await renderThirdPartyNotices(manifest, root);
    if (
      !notices.includes("Copyright (c) Example contributors") ||
      notices.includes("<year>") || notices.includes("<copyright holders>") ||
      !notices.includes("Distributed license SHA-256:") ||
      !notices.includes(
        await sha256(
          template.replace(
            "Copyright (c) <year> <copyright holders>",
            "Copyright (c) Example contributors",
          ).trimEnd(),
        ),
      )
    ) {
      throw new Error("Generated notices contain unresolved MIT placeholders");
    }
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

async function copyMediaTypeInputs(root: URL): Promise<void> {
  const sourceRoot = new URL("../../", import.meta.url);
  for (const artifact of [mediaTypeSource.database, mediaTypeSource.license]) {
    const target = new URL(artifact.destination, root);
    await Deno.mkdir(new URL("./", target), { recursive: true });
    await Deno.copyFile(new URL(artifact.destination, sourceRoot), target);
  }
}

Deno.test("license notice generation rejects changed cached license text", async () => {
  const directory = await Deno.makeTempDir({ dir: Deno.cwd(), prefix: ".license-hash-" });
  const root = new URL(`file://${directory}/`);
  const destination =
    "codegen/pangit/raw-rest-client-generation/openapi-specifications/downloaded/licenses/example/latest/LICENSE.txt";
  try {
    await Deno.mkdir(new URL("./", new URL(destination, root)), { recursive: true });
    await Deno.writeTextFile(new URL(destination, root), fixtureLicense);
    const manifest = {
      schemaVersion: 1,
      gitHosts: {
        example: {
          name: "Example",
          versions: {
            latest: {
              source: "https://example.invalid/openapi.json",
              sha256: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              license: {
                spdx: "MIT",
                attribution: "Fixture",
                text: {
                  source: "https://example.invalid/LICENSE",
                  destination,
                  bytes: 1,
                  sha256: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                },
                notices: [],
              },
            },
          },
        },
      },
    } as unknown as GeneratedOpenApiManifest;
    let rejected = false;
    try {
      await renderThirdPartyNotices(manifest, root);
    } catch (error) {
      rejected = error instanceof Error && error.message.includes("hash mismatch");
    }
    if (!rejected) throw new Error("Changed cached license text was accepted");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
