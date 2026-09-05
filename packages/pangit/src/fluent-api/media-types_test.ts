import type {
  ContentBlobOptions,
  ContentReadFailure,
  ProviderMediaType,
} from "./adapter-contract/content-body.ts";
import type { ContentData } from "./adapter-contract/content.ts";
import type { BlobData } from "./adapter-contract/optional/blob-reads.ts";
import { ContentReadError, ValidationError } from "./adapter-contract/errors.ts";
import { createWebBlob } from "./content-body.ts";
import { createContent } from "./entities/Content.ts";
import { createBlob } from "./entities/optional/Blob.ts";
import { mediaTypeByExtension } from "./generated-media-types.ts";
import { resolveContentMediaType, validateContentBlobOptions } from "./media-types.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

const context = { operation: "test.blob" };
function resolve(path?: string, mediaType?: ProviderMediaType, options: ContentBlobOptions = {}) {
  return resolveContentMediaType({ path, mediaType }, options, context);
}

function failure(action: () => unknown, reason: ContentReadFailure): ContentReadError {
  try {
    action();
  } catch (error) {
    assert(error instanceof ContentReadError, "Expected a typed content read error");
    assert(error.reason === reason, `Expected ${reason}, got ${error.reason}`);
    assert(error.operation === context.operation, "Error lost operation context");
    return error;
  }
  throw new Error(`Expected ${reason}`);
}

Deno.test("MIME resolution prefers explicit type, reliable provider evidence, then filename", () => {
  assert(
    resolve("image.jpg", { value: "IMAGE/PNG; charset=binary", reliable: true }) === "image/png",
    "Reliable provider MIME was ignored",
  );
  assert(
    resolve(undefined, { value: "image/webp", reliable: true }) === "image/webp",
    "A reliable MIME type needs no filename",
  );
  assert(
    resolve("image.jpg", { value: "image/png", reliable: true }, { type: "IMAGE/AVIF" }) ===
      "image/avif",
    "Explicit caller type was ignored",
  );
  assert(
    resolve("data.json", { value: "text/plain; charset=utf-8", reliable: false }) ===
      "application/json",
    "Coerced provider type overrode the path",
  );
  assert(
    resolve("image.png", { value: "image/jpeg", reliable: false }) === "image/png",
    "Unreliable provider metadata was trusted",
  );
  assert(
    resolve("data.bin", { value: "text/plain", reliable: true }) === "text/plain",
    "A genuinely reliable plain-text MIME type was rejected",
  );
  assert(
    resolve("unknown", undefined, { fileName: "images/photo.PNG" }) === "image/png",
    "Filename hint was ignored",
  );
  assert(
    resolve("wrong.png", undefined, { fileName: "right.pdf" }) === "application/pdf",
    "Filename hint did not replace the path",
  );
});

Deno.test("MIME fallback uses the complete standard registry with deterministic path semantics", () => {
  assert(
    Object.keys(mediaTypeByExtension).length > 1_200,
    "Registry was replaced with an incomplete handwritten map",
  );
  for (const [extension, type] of Object.entries(mediaTypeByExtension)) {
    if (type === "application/octet-stream") {
      failure(() => resolve(`file.${extension}`), "unknown-media-type");
    } else {
      assert(
        resolve(`dir.with.dots/file.${extension.toUpperCase()}`) === type,
        `Missing standard extension ${extension}`,
      );
    }
  }
  for (
    const [path, type] of [
      ["avatar.png", "image/png"],
      ["photo.jpeg", "image/jpeg"],
      ["image.avif", "image/avif"],
      ["image.webp", "image/webp"],
      ["icon.svg", "image/svg+xml"],
      ["document.pdf", "application/pdf"],
      ["font.woff2", "font/woff2"],
      ["module.wasm", "application/wasm"],
      ["config.json", "application/json"],
      ["README.md", "text/markdown"],
      ["archive.tar.gz", "application/gzip"],
      ["literal?#%20.PNG", "image/png"],
      [".config.json", "application/json"],
    ]
  ) assert(resolve(path) === type, `${path} resolved incorrectly`);
  for (
    const path of [
      undefined,
      "README",
      ".png",
      "directory.png/file",
      "file.",
      "file.unknown-extension",
      "file.png?download=1",
      "file.png/",
      "file.constructor",
      "file.__proto__",
    ]
  ) {
    failure(() => resolve(path), "unknown-media-type");
  }
});

Deno.test("generic, missing and malformed provider types fall back or fail explicitly", () => {
  for (
    const value of [
      "application/octet-stream",
      "binary/octet-stream",
      "application/binary",
      "application/unknown",
      "unknown/unknown",
      "",
      "not-a-mime",
      "image/*",
      "*/*",
      "image/png, image/jpeg",
      "image/png\r\nx-header:bad",
    ]
  ) {
    assert(
      resolve("image.png", { value, reliable: true }) === "image/png",
      `Provider default ${value} blocked the fallback`,
    );
    failure(() => resolve("unknown", { value, reliable: true }), "unknown-media-type");
  }
  failure(() => resolve("file.bin"), "unknown-media-type");
  assert(
    resolve("file.bin", undefined, { type: "application/octet-stream" }) ===
      "application/octet-stream",
    "An intentional binary override was rejected",
  );
  assert(
    resolve("unknown", { value: "application/vnd.acme+json", reliable: true }) ===
      "application/vnd.acme+json",
    "A specific provider vendor MIME was rejected",
  );
});

Deno.test("invalid Blob options are rejected locally and retain typed context", () => {
  for (
    const type of [
      "",
      "png",
      "image/",
      "/png",
      "image/*",
      "image/png, text/plain",
      "text/plain\n",
      "image/png\u0000",
    ]
  ) {
    failure(() => validateContentBlobOptions({ type }, context), "invalid-media-type");
    failure(
      () => resolve("image.png", { value: "image/png", reliable: true }, { type }),
      "invalid-media-type",
    );
  }
  for (const fileName of ["", " ", "image\0.png"]) {
    try {
      validateContentBlobOptions({ fileName }, context);
      throw new Error("Accepted an invalid filename hint");
    } catch (error) {
      assert(error instanceof ValidationError, "Expected filename ValidationError");
    }
  }
});

Deno.test("web Blob conversion retains exact bytes, MIME type, and immutable snapshots", async () => {
  const original = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 255]);
  const providerType = { value: "image/png", reliable: true };
  const content = createContent(
    {
      kind: "file",
      path: "image.unknown",
      name: "image.unknown",
      bytes: original,
      mediaType: providerType,
      native: {},
    } as ContentData<"test-provider", "1.0">,
  );
  const gitBlob = createBlob(
    {
      sha: "a".repeat(40),
      size: original.length,
      bytes: original,
      mediaType: providerType,
      native: {},
    } as BlobData<"test-provider", "1.0">,
  );
  original.fill(0);
  providerType.value = "text/plain";
  for (const entity of [content, gitBlob]) {
    const first = entity.blob();
    assert(first instanceof globalThis.Blob, "Returned a custom wrapper instead of a web Blob");
    assert(first.type === "image/png" && first.size === 6, "Blob metadata changed");
    assert(first !== entity.blob(), "Conversion reused a Blob instance");
    const exposed = new Uint8Array(await first.arrayBuffer());
    assert(exposed[0] === 0x89 && exposed[5] === 255, "Binary bytes changed");
    exposed.fill(0);
    entity.bytes!.fill(0);
    assert(
      new Uint8Array(await entity.blob().arrayBuffer())[0] === 0x89,
      "Mutable output leaked into the snapshot",
    );
  }
  const empty = createWebBlob(
    { kind: "file", path: "empty.txt", bytes: new Uint8Array() },
    {},
    context,
  );
  assert(empty.size === 0 && empty.type === "text/plain", "Empty files lost their MIME type");
  assert(await empty.text() === "", "Empty file bytes changed");
  failure(() => createWebBlob({ path: "image.png" }, {}, context), "bytes-unavailable");
  failure(
    () =>
      createWebBlob({ kind: "symlink", path: "image.png", bytes: new Uint8Array() }, {}, context),
    "not-a-file",
  );
});

Deno.test("Git blob bodies resolve filename hints without inventing filenames or MIME metadata", () => {
  const gitBlob = createBlob(
    { sha: "a".repeat(40), size: 1, bytes: new Uint8Array([1]), native: {} } as BlobData<
      "test-provider",
      "1.0"
    >,
  );
  assert(
    gitBlob.blob({ fileName: "image.png" }).type === "image/png",
    "Git blob filename lookup failed",
  );
  assert(
    gitBlob.blob({ type: "image/webp" }).type === "image/webp",
    "Git blob explicit type failed",
  );
  try {
    gitBlob.blob();
    throw new Error("Invented a MIME type for a filename-free Git blob");
  } catch (error) {
    assert(
      error instanceof ContentReadError && error.reason === "unknown-media-type",
      "Expected unknown-media-type for a Git blob without hints",
    );
  }
});
