type GiteaManifest = {
  schemaVersion: 1;
  providers: {
    gitea: {
      versions: Record<string, {
        containerImage: string | null;
      }>;
    };
  };
};

const manifestFile = new URL("../specs/raw/manifest.json", import.meta.url);
const composeTemplateFile = new URL("./templates/gitea/compose.yaml", import.meta.url);
const bootstrapTemplateFile = new URL("./templates/gitea/bootstrap.sh", import.meta.url);
const outputDirectory = new URL("../../tests/docker/gitea/", import.meta.url);

function renderTemplate(template: string, values: Record<string, string>): string {
  let rendered = template;
  for (const [name, value] of Object.entries(values)) {
    rendered = rendered.replaceAll(`__${name}__`, value);
  }
  if (/__[A-Z_]+__/.test(rendered)) {
    throw new Error("Generated Gitea sandbox contains unresolved template values");
  }
  return rendered;
}

async function readManifest(): Promise<GiteaManifest> {
  const value: unknown = JSON.parse(await Deno.readTextFile(manifestFile));
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid API specification manifest");
  }
  const manifest = value as Partial<GiteaManifest>;
  if (manifest.schemaVersion !== 1 || manifest.providers?.gitea?.versions === undefined) {
    throw new Error("Manifest has no Gitea versions");
  }
  return manifest as GiteaManifest;
}

export async function generateGiteaSandboxes(): Promise<void> {
  const manifest = await readManifest();
  const composeTemplate = await Deno.readTextFile(composeTemplateFile);
  const bootstrapTemplate = await Deno.readTextFile(bootstrapTemplateFile);
  const versions = Object.entries(manifest.providers.gitea.versions)
    .toSorted(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }));

  await Deno.mkdir(outputDirectory, { recursive: true });
  const expectedVersions = new Set(versions.map(([version]) => version));
  for await (const entry of Deno.readDir(outputDirectory)) {
    if (entry.isDirectory && !expectedVersions.has(entry.name)) {
      await Deno.remove(new URL(`${entry.name}/`, outputDirectory), { recursive: true });
    }
  }

  for (const [version, versionManifest] of versions) {
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
      throw new Error(`Invalid Gitea sandbox version ${version}`);
    }
    const containerImage = versionManifest.containerImage;
    if (containerImage === null || !containerImage.split("@", 1)[0].endsWith(`:${version}`)) {
      throw new Error(`Gitea ${version} has no matching container image`);
    }

    const versionDirectory = new URL(`${version}/`, outputDirectory);
    const resultsDirectory = new URL("results/", versionDirectory);
    await Deno.mkdir(resultsDirectory, { recursive: true });
    const values = {
      CONTAINER_IMAGE: containerImage,
      PROJECT_NAME: `branch-press-gitea-${version.replaceAll(".", "-")}`,
      VERSION: version,
    };
    await Deno.writeTextFile(
      new URL("compose.yaml", versionDirectory),
      renderTemplate(composeTemplate, values),
    );
    await Deno.writeTextFile(
      new URL("bootstrap.sh", versionDirectory),
      renderTemplate(bootstrapTemplate, values),
    );
    await Deno.writeTextFile(new URL(".gitignore", resultsDirectory), "*\n!.gitignore\n");

    console.log(JSON.stringify({
      provider: "gitea",
      version,
      image: containerImage,
      destination: `tests/docker/gitea/${version}/compose.yaml`,
    }));
  }
}

if (import.meta.main) {
  await generateGiteaSandboxes();
}
