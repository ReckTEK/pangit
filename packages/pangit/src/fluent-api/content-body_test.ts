import type { ContentData } from "./adapter-contract/content.ts";
import type { BlobData } from "./adapter-contract/optional/blob-reads.ts";
import type { ContentReadFailure, ReadableContentBody } from "./adapter-contract/content-body.ts";
import { ContentReadError } from "./adapter-contract/errors.ts";
import { createContent } from "./entities/Content.ts";
import { createBlob } from "./entities/optional/Blob.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function failure(action: () => unknown, reason: ContentReadFailure): void {
  try {
    action();
  } catch (error) {
    assert(error instanceof ContentReadError, "Expected ContentReadError");
    assert(error.reason === reason, `Expected ${reason}, got ${error.reason}`);
    return;
  }
  throw new Error(`Expected ${reason}`);
}

function content(bytes?: Uint8Array, kind: ContentData<"test-provider", "1.0">["kind"] = "file") {
  return createContent({
    kind,
    path: "file",
    name: "file",
    bytes,
    native: {},
  } as ContentData<"test-provider", "1.0">);
}

function blob(bytes: Uint8Array) {
  return createBlob({
    sha: "a".repeat(40),
    size: bytes.length,
    bytes,
    native: {},
  } as BlobData<"test-provider", "1.0">);
}

for (const [name, create] of [["content", content], ["blob", blob]] as const) {
  Deno.test(`${name} body conversions are repeatable, strict UTF-8, and defensive`, () => {
    const original = new TextEncoder().encode('\uFEFF{"message":"héllo 🌍"}');
    const body = create(original);
    original.fill(0);
    assert(body.text() === '{"message":"héllo 🌍"}', "UTF-8 or BOM handling changed");
    const first = body.json() as { message: string };
    first.message = "changed";
    assert((body.json() as { message: string }).message === "héllo 🌍", "JSON snapshot was shared");
    const buffer = body.arrayBuffer();
    new Uint8Array(buffer).fill(0);
    assert(body.text() === '{"message":"héllo 🌍"}', "arrayBuffer exposed snapshot storage");
    const exposed = body.bytes!;
    exposed.fill(0);
    assert(body.text() === '{"message":"héllo 🌍"}', "bytes exposed snapshot storage");
    assert(body.arrayBuffer() !== body.arrayBuffer(), "Buffer reads reused mutable storage");
    assert(Object.isFrozen(body), "Entity is not frozen");
  });

  Deno.test(`${name} empty, binary, and invalid JSON bodies never become silent defaults`, () => {
    const empty = create(new Uint8Array());
    assert(empty.text() === "", "An empty loaded file is valid text");
    assert(empty.arrayBuffer().byteLength === 0, "An empty loaded file has an empty buffer");
    failure(() => empty.json(), "invalid-json");
    const binary = create(new Uint8Array([0, 255, 128]));
    assert(new Uint8Array(binary.arrayBuffer())[1] === 255, "Binary data changed");
    failure(() => binary.text(), "invalid-utf8");
    failure(() => binary.json(), "invalid-utf8");
    failure(() => create(new TextEncoder().encode("not json")).json(), "invalid-json");
    for (const value of [null, false, 0, "", [], { value: 1 }]) {
      const parsed = create(new TextEncoder().encode(JSON.stringify(value))).json();
      assert(JSON.stringify(parsed) === JSON.stringify(value), "Valid JSON value changed");
    }
  });
}

Deno.test("metadata and linked-content bodies fail locally without implicit dereferencing", () => {
  for (
    const method of [
      "text",
      "json",
      "arrayBuffer",
      "blob",
    ] as const satisfies readonly (keyof ReadableContentBody)[]
  ) {
    failure(() => content()[method](), "bytes-unavailable");
    for (const kind of ["directory", "symlink", "submodule"] as const) {
      failure(() => content(new Uint8Array(), kind)[method](), "not-a-file");
    }
  }
  const childBytes = new TextEncoder().encode("target");
  const linked = createContent({
    kind: "symlink",
    path: "link",
    name: "link",
    dereferenced: {
      kind: "file",
      path: "target",
      name: "target",
      bytes: childBytes,
      native: {},
    },
    native: {},
  } as ContentData<"test-provider", "1.0">);
  childBytes.fill(0);
  assert(linked.dereferenced?.text() === "target", "Dereferenced content lacks a private snapshot");
  failure(() => linked.text(), "not-a-file");
});
