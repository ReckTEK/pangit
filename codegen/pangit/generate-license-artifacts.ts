import { generatedComment } from "../generated-notices.ts";
import { workspace, type WorkspacePaths } from "../workspace-layout.ts";
import type { GeneratedOpenApiManifest } from "./raw-rest-client-generation/openapi-specifications/download-openapi-specifications.ts";
import { sha256 } from "./raw-rest-client-generation/openapi-specifications/download-openapi-specifications.ts";

const manifestPath =
  "codegen/pangit/raw-rest-client-generation/openapi-specifications/downloaded/generated-manifest.json";

/** Build repository and package license artifacts from downloaded, hashed upstream evidence. */
export async function generateLicenseArtifacts(paths: WorkspacePaths = workspace): Promise<void> {
  const manifest = JSON.parse(
    await Deno.readTextFile(new URL(manifestPath, paths.root)),
  ) as GeneratedOpenApiManifest;
  const notices = await renderThirdPartyNotices(manifest, paths.root);
  const license = await Deno.readTextFile(new URL("LICENSE", paths.root));
  assertMitLicense(license);

  await Deno.writeTextFile(new URL("THIRD_PARTY_NOTICES.md", paths.root), notices);
  await Deno.writeTextFile(new URL("LICENSE", paths.packages.pangit), license);
  await Deno.writeTextFile(new URL("THIRD_PARTY_NOTICES.md", paths.packages.pangit), notices);
}

/** Render complete license text plus immutable provenance for every distributed schema. */
export async function renderThirdPartyNotices(
  manifest: GeneratedOpenApiManifest,
  root: URL,
): Promise<string> {
  if (manifest.schemaVersion !== 1 || Object.keys(manifest.gitHosts).length === 0) {
    throw new Error("Invalid or empty OpenAPI provenance manifest");
  }

  const sections: string[] = [];
  for (const provider of Object.keys(manifest.gitHosts).toSorted()) {
    const host = manifest.gitHosts[provider];
    for (const version of Object.keys(host.versions).toSorted(compareVersions)) {
      const release = host.versions[version];
      if (release.license === null) {
        sections.push(`## ${host.name} ${version}

${markdownUrlItem("OpenAPI source", release.source)}
- OpenAPI SHA-256: \`${release.sha256}\`
- Schema license evidence: No separate license file is recorded.
- Modification notice: PanGit downloaded and normalized the schema, then generated TypeScript types,
  operation metadata, REST-client methods, tests, and reference documentation.`);
        continue;
      }
      const downloadedLicenseText = await readVerifiedArtifact(release.license.text, root);
      const licenseText = completeLicenseTemplate(
        downloadedLicenseText,
        release.license.attribution,
      );
      const completedTemplate = licenseText !== downloadedLicenseText;
      const noticeTexts = await Promise.all(
        release.license.notices.map((notice) => readVerifiedArtifact(notice, root)),
      );
      const upstreamNotices = release.license.notices.map((notice, index) =>
        `### Upstream notice ${index + 1}

${markdownUrlItem("Source", notice.source)}
- SHA-256: \`${notice.sha256}\`

${textFence(noticeTexts[index])}`
      ).join("\n\n");
      const licenseMetadata = [
        `- License: \`${release.license.spdx}\``,
        ...(release.license.declaration === null ? [] : [
          markdownTextItem("Embedded schema declaration", release.license.declaration.name),
          markdownUrlItem("Declared terms", release.license.declaration.url),
        ]),
        markdownUrlItem("License source", release.license.text.source),
        markdownTextItem("Downloaded license SHA-256", `\`${release.license.text.sha256}\``),
        ...(completedTemplate
          ? [
            "- License text completion: Generic source fields completed with the attribution above.",
            markdownTextItem(
              "Distributed license SHA-256",
              `\`${await sha256(licenseText.trimEnd())}\``,
            ),
          ]
          : []),
      ].join("\n");

      sections.push(`## ${host.name} ${version}

${release.license.attribution}

${markdownUrlItem("OpenAPI source", release.source)}
- OpenAPI SHA-256: \`${release.sha256}\`
${licenseMetadata}
- Modification notice: PanGit downloaded and normalized the schema, then generated TypeScript types,
  operation metadata, REST-client methods, tests, and reference documentation.

### License text

${textFence(licenseText)}${upstreamNotices.length === 0 ? "" : `\n\n${upstreamNotices}`}`);
    }
  }

  return `${generatedComment("<!--")}\n# Third-Party Notices

PanGit's original source code is licensed under the MIT License. The generated REST clients and
reference material also derive from the upstream OpenAPI descriptions listed below. Where separate
license evidence is available, PanGit preserves the downloaded evidence, attribution, source, and
content hash here. Generic license templates are completed with the recorded attribution, with the
distributed text hashed separately. Entries without separate license evidence remain identified by
source and content hash. Provider names and trademarks belong to their owners; compatibility does
not imply affiliation or endorsement.

${sections.join("\n\n")}
`;
}

function markdownUrlItem(label: string, value: string): string {
  const inline = `- ${label}: ${value}`;
  return inline.length <= 100 ? inline : `- ${label}:\n  ${value}`;
}

function markdownTextItem(label: string, value: string): string {
  const lines: string[] = [];
  let line = `- ${label}:`;
  for (const word of value.trim().split(/\s+/)) {
    if (`${line} ${word}`.length > 100) {
      lines.push(line);
      line = `  ${word}`;
    } else {
      line += ` ${word}`;
    }
  }
  lines.push(line);
  return lines.join("\n");
}

function textFence(value: string): string {
  const longestBacktickRun = Math.max(
    0,
    ...Array.from(value.matchAll(/`+/g), (match) => match[0].length),
  );
  const fence = "`".repeat(Math.max(3, longestBacktickRun + 1));
  return `${fence}text\n${value.trimEnd()}\n${fence}`;
}

function completeLicenseTemplate(value: string, attribution: string): string {
  const completed = value.replace(
    "Copyright (c) <year> <copyright holders>",
    attribution,
  );
  if (/<(?:year|copyright holders)>/i.test(completed)) {
    throw new Error("License text contains unresolved placeholders");
  }
  return completed;
}

type VerifiedArtifact = {
  destination: string;
  sha256: string;
};

async function readVerifiedArtifact(artifact: VerifiedArtifact, root: URL): Promise<string> {
  if (artifact.destination.startsWith("/") || artifact.destination.includes("..")) {
    throw new Error(`License artifact escapes workspace: ${artifact.destination}`);
  }
  const body = await Deno.readTextFile(new URL(artifact.destination, root));
  const actual = await sha256(body);
  if (actual !== artifact.sha256) {
    throw new Error(
      `License artifact hash mismatch for ${artifact.destination}: ${actual} != ${artifact.sha256}`,
    );
  }
  return body;
}

function assertMitLicense(source: string): void {
  if (
    !source.startsWith("MIT License\n") ||
    !source.includes("Permission is hereby granted, free of charge") ||
    !source.includes('THE SOFTWARE IS PROVIDED "AS IS"')
  ) {
    throw new Error("Root LICENSE is not the canonical MIT license");
  }
}

function compareVersions(left: string, right: string): number {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  if (leftParts.every(Number.isFinite) && rightParts.every(Number.isFinite)) {
    for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index++) {
      const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
      if (difference !== 0) return difference;
    }
    return 0;
  }
  return left.localeCompare(right);
}
