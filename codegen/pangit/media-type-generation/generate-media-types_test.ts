import { workspace, type WorkspacePaths } from "../../workspace-layout.ts";
import {
  createExtensionMap,
  generateMediaTypes,
  type MediaTypeDatabase,
  mediaTypeSource,
  readMediaTypeInputs,
  renderMediaTypes,
} from "./generate-media-types.ts";
import { mediaTypeByExtension } from "../../../packages/pangit/src/fluent-api/generated-media-types.ts";

Deno.test("MIME registry contains all registered extensions with standard collision preferences", () => {
  const database: MediaTypeDatabase = {
    "application/octet-stream": { source: "iana", extensions: ["image"] },
    "application/mp4": { source: "iana", extensions: ["mp4"] },
    "application/example": { extensions: ["tie"] },
    "application/vendor": { source: "apache", extensions: ["priority"] },
    "image/example": { source: "nginx", extensions: ["image"] },
    "text/example": { source: "iana", extensions: ["priority"] },
    "text/fallback": { extensions: ["tie"] },
    "video/mp4": { source: "iana", extensions: ["mp4"] },
  };
  const result = createExtensionMap(database);
  assertEqual(Object.keys(result).length, 4);
  assertEqual(result.image, "image/example");
  assertEqual(result.mp4, "video/mp4");
  assertEqual(result.priority, "text/example");
  assertEqual(result.tie, "application/example");
  assertEqual(Object.getPrototypeOf(result), null);
  assertEqual(Object.isFrozen(result), true);
  assertEqual(result.constructor, undefined);
  assertEqual(
    renderMediaTypes(Object.fromEntries(Object.entries(database).reverse())),
    renderMediaTypes(database),
  );
});

Deno.test("published MIME registry exactly matches every pinned upstream extension", async () => {
  const { database, license } = await readMediaTypeInputs();
  const expected = createExtensionMap(database);
  const upstreamExtensions = new Set(
    Object.values(database).flatMap((entry) => entry.extensions ?? []),
  );
  assertEqual(upstreamExtensions.size, 1239);
  assertEqual(Object.keys(mediaTypeByExtension).length, upstreamExtensions.size);
  for (const extension of upstreamExtensions) {
    assertEqual(mediaTypeByExtension[extension], expected[extension]);
  }
  assertEqual(Object.isFrozen(mediaTypeByExtension), true);
  assertEqual(
    await Deno.readTextFile(
      new URL("src/fluent-api/generated-media-types.ts", workspace.packages.pangit),
    ),
    renderMediaTypes(database),
  );
  for (
    const [extension, type] of Object.entries({
      png: "image/png",
      avif: "image/avif",
      heic: "image/heic",
      svg: "image/svg+xml",
      woff2: "font/woff2",
      pdf: "application/pdf",
      md: "text/markdown",
      js: "text/javascript",
      ts: "video/mp2t",
      gz: "application/gzip",
      bin: "application/octet-stream",
    })
  ) assertEqual(mediaTypeByExtension[extension], type);
  assertEqual(Object.hasOwn(mediaTypeByExtension, "pangit-unregistered"), false);
  if (
    !license.includes("Copyright (c) 2014 Jonathan Ong") ||
    !license.includes("THE SOFTWARE IS PROVIDED")
  ) {
    throw new Error("Upstream MIT attribution or terms missing");
  }
});

Deno.test("cached MIME generation is offline and rejects modified inputs without replacing output", async () => {
  const paths = await fixturePaths();
  try {
    await copyInputs(paths.root);
    const noNetwork: typeof fetch = () => {
      throw new Error("Cached generation used the network");
    };
    await generateMediaTypes({ cached: true }, paths, noNetwork);
    const output = new URL("src/fluent-api/generated-media-types.ts", paths.packages.pangit);
    const original = await Deno.readTextFile(output);
    for (const artifact of [mediaTypeSource.database, mediaTypeSource.license]) {
      const target = new URL(artifact.destination, paths.root);
      const input = await Deno.readTextFile(target);
      await Deno.writeTextFile(target, `${input}\n`);
      await assertRejects(
        () => generateMediaTypes({ cached: true }, paths, noNetwork),
        "hash mismatch",
      );
      assertEqual(await Deno.readTextFile(output), original);
      await Deno.writeTextFile(target, input);
    }
  } finally {
    await Deno.remove(paths.root, { recursive: true });
  }
});

Deno.test("MIME downloads validate every pinned input before updating checked-in artifacts", async () => {
  const paths = await fixturePaths();
  const artifacts = [mediaTypeSource.database, mediaTypeSource.license];
  try {
    const bodies = await Promise.all(
      artifacts.map((artifact) => Deno.readTextFile(new URL(artifact.destination, workspace.root))),
    );
    const requested: string[] = [];
    const fetcher: typeof fetch = (input) => {
      const url = String(input);
      requested.push(url);
      const index = artifacts.findIndex((artifact) => artifact.source === url);
      if (index < 0) throw new Error(`Unexpected MIME source: ${url}`);
      return Promise.resolve(new Response(bodies[index]));
    };
    await generateMediaTypes({ cached: false }, paths, fetcher);
    assertEqual(
      requested.toSorted().join(","),
      artifacts.map((artifact) => artifact.source).toSorted().join(","),
    );
    const badDownload: typeof fetch = (input) =>
      String(input) === mediaTypeSource.license.source
        ? Promise.resolve(new Response("changed license"))
        : fetcher(input);
    await assertRejects(
      () => generateMediaTypes({ cached: false }, paths, badDownload),
      "hash mismatch",
    );
    for (const [index, artifact] of artifacts.entries()) {
      assertEqual(
        await Deno.readTextFile(new URL(artifact.destination, paths.root)),
        bodies[index],
      );
    }
    await assertRejects(
      () =>
        generateMediaTypes(
          { cached: false },
          paths,
          () => Promise.resolve(new Response("missing", { status: 404 })),
        ),
      "download failed: 404",
    );
  } finally {
    await Deno.remove(paths.root, { recursive: true });
  }
});

async function fixturePaths(): Promise<WorkspacePaths> {
  const directory = await Deno.makeTempDir({ dir: Deno.cwd(), prefix: ".mime-generation-" });
  const root = new URL(`file://${directory}/`);
  return {
    root,
    codegen: {
      root: new URL("codegen/", root),
      pangit: new URL("codegen/pangit/", root),
      pangitSite: new URL("codegen/pangit-site/", root),
    },
    packages: {
      pangit: new URL("packages/pangit/", root),
      site: new URL("packages/pangit-site/", root),
    },
  };
}

async function copyInputs(root: URL): Promise<void> {
  for (const artifact of [mediaTypeSource.database, mediaTypeSource.license]) {
    const target = new URL(artifact.destination, root);
    await Deno.mkdir(new URL("./", target), { recursive: true });
    await Deno.copyFile(new URL(artifact.destination, workspace.root), target);
  }
}

function assertEqual(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
}

async function assertRejects(operation: () => Promise<void>, expected: string): Promise<void> {
  try {
    await operation();
  } catch (error) {
    if (error instanceof Error && error.message.includes(expected)) return;
    throw error;
  }
  throw new Error(`Expected error containing ${expected}`);
}
