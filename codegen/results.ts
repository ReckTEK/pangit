/** Raw E2E evidence is retained independently of generated client/sandbox artifacts. */
export type RawResults = { provider: string; version: string; directory: URL };

async function directories(directory: URL): Promise<string[]> {
  const names: string[] = [];
  try {
    for await (const entry of Deno.readDir(directory)) {
      if (entry.isDirectory) names.push(entry.name);
    }
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
  return names.sort();
}

export async function rawResultDirectories(generated: URL): Promise<RawResults[]> {
  const results: RawResults[] = [];
  for (const provider of await directories(generated)) {
    const providerDirectory = new URL(`${encodeURIComponent(provider)}/`, generated);
    for (const version of await directories(providerDirectory)) {
      const directory = new URL(`${encodeURIComponent(version)}/tests/results/`, providerDirectory);
      try {
        if (!(await Deno.lstat(directory)).isDirectory) {
          throw new Error(`Raw results must be a directory: ${directory.pathname}`);
        }
        results.push({ provider, version, directory });
      } catch (error) {
        if (!(error instanceof Deno.errors.NotFound)) throw error;
      }
    }
  }
  return results;
}

export async function cleanGeneratedArtifacts(generated: URL): Promise<void> {
  const preserved = (await rawResultDirectories(generated)).map((entry) => entry.directory.href);
  const clean = async (directory: URL): Promise<void> => {
    for await (const entry of Deno.readDir(directory)) {
      const child = new URL(
        `${encodeURIComponent(entry.name)}${entry.isDirectory ? "/" : ""}`,
        directory,
      );
      if (preserved.includes(child.href)) continue;
      if (entry.isDirectory && preserved.some((path) => path.startsWith(child.href))) {
        await clean(child);
      } else {
        await Deno.remove(child, { recursive: true });
      }
    }
  };
  await Deno.mkdir(generated, { recursive: true });
  await clean(generated);
}
