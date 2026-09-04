import type { ReadFileOptions } from "../../fluent-api/adapter-contract/content.ts";
import {
  ContentReadError,
  ContentUnavailableError,
  FluentOperationError,
  NotFoundError,
  OperationAbortedError,
  ProviderInvariantError,
} from "../../fluent-api/adapter-contract/errors.ts";
import type { RepositoryData } from "../../fluent-api/adapter-contract/repositories.ts";
import { createRepositoryContent } from "../../fluent-api/capabilities/RepositoryContent.ts";
import { createRepositoryBlobs } from "../../fluent-api/capabilities/optional/RepositoryBlobs.ts";
import { GiteaGitHostAdapter } from "./GiteaGitHostAdapter.ts";
import type { GiteaVersion } from "./native/GiteaEntityNative.ts";

const sha = "0123456789abcdef0123456789abcdef01234567";
const lastCommitSha = "abcdef0123456789abcdef0123456789abcdef01";
const encoder = new TextEncoder();

for (const version of ["1.26.4", "1.27.2"] as const) {
  Deno.test(`Gitea ${version} file reading helpers use one request and preserve explicit options`, async () => {
    const fixture = createFixture(version);
    const controller = new AbortController();
    const options = {
      ref: "feature/read me",
      includeCommitMetadata: true,
      signal: controller.signal,
      includeBytes: false,
    } as ReadFileOptions;
    fixture.respond(() => fileResponse("héllo 🌍\n"));
    assertEquals(await fixture.content.readText("README.md", options), "héllo 🌍\n");
    assertEquals(fixture.requests.length, 1);
    const url = new URL(fixture.requests[0].url);
    assertEquals(url.pathname, "/api/v1/repos/acme/project/contents-ext/README.md");
    assertEquals(url.searchParams.get("ref"), "feature/read me");
    assertEquals(url.searchParams.get("includes"), "file_content,commit_metadata");
    controller.abort();
    assert(fixture.requests[0].signal.aborted, "caller signal did not reach the provider");

    fixture.respond(() => fileResponse("\ufeffhello"));
    assertEquals(await fixture.content.readText("README.md"), "hello");
    fixture.respond(() => fileResponse(""));
    assertEquals(await fixture.content.readText("README.md"), "");
    assertEquals([...await fixture.content.readBytes("README.md")], []);
    fixture.respond(() => fileResponse(new Uint8Array([0, 255, 128, 65])));
    assertEquals([...await fixture.content.readBytes("README.md")], [0, 255, 128, 65]);
    assertEquals(fixture.requests.length, 5);
  });

  Deno.test(`Gitea ${version} file JSON helpers preserve JSON values and reject invalid bodies`, async () => {
    const fixture = createFixture(version);
    const values = [{ name: "café", list: [1, true, null] }, [1, 2], null, false, 0, "hello"];
    for (const value of values) {
      fixture.respond(() => fileResponse(`\ufeff${JSON.stringify(value)}`));
      assertEquals(await fixture.content.readJson("data.json"), value);
    }
    for (const malformed of ["", "{", "undefined", '{"trailing":true,}']) {
      fixture.respond(() => fileResponse(malformed));
      const error = await rejection(() => fixture.content.readJson("data.json"));
      assertContentError(error, "invalid-json", "readContentJson", version);
    }
    fixture.respond(() => fileResponse(new Uint8Array([0xc3, 0x28])));
    assertContentError(
      await rejection(() => fixture.content.readText("README.md")),
      "invalid-utf8",
      "readContentText",
      version,
    );
    assertContentError(
      await rejection(() => fixture.content.readJson("data.json")),
      "invalid-utf8",
      "readContentJson",
      version,
    );
    assertEquals(fixture.requests.length, values.length + 6);
  });

  Deno.test(`Gitea ${version} reading helpers reject non-files without dereferencing links`, async () => {
    const fixture = createFixture(version);
    const payloads = [
      { dir_contents: [] },
      { file_contents: { type: "symlink", path: "link", name: "link", target: "README.md" } },
      {
        file_contents: {
          type: "submodule",
          path: "module",
          name: "module",
          submodule_git_url: "https://external.invalid/repository.git",
        },
      },
    ];
    const reads = [
      ["readContentBytes", () => fixture.content.readBytes("path")],
      ["readContentText", () => fixture.content.readText("path")],
      ["readContentJson", () => fixture.content.readJson("path")],
    ] as const;
    for (const payload of payloads) {
      fixture.respond(() => Response.json(payload));
      for (const [operation, read] of reads) {
        assertContentError(await rejection(read), "not-a-file", operation, version);
      }
    }
    assertEquals(fixture.requests.length, 9);
  });

  Deno.test(`Gitea ${version} file provider errors retain helper operation identities`, async () => {
    const fixture = createFixture(version);
    fixture.respond(() =>
      Response.json({ file_contents: { type: "file", name: "big", path: "big", size: 100 } })
    );
    const unavailable = await rejection(() => fixture.content.readText("big"));
    assert(unavailable instanceof ContentUnavailableError, "provider unavailability was hidden");
    assertEquals(unavailable.operation, "readContentText");

    fixture.respond(() =>
      Response.json({
        file_contents: {
          type: "file",
          name: "bad",
          path: "bad",
          size: 1,
          encoding: "base64",
          content: "?bad?",
        },
      })
    );
    const malformed = await rejection(() => fixture.content.readJson("bad"));
    assert(malformed instanceof ProviderInvariantError, "malformed base64 was accepted");
    assertEquals(malformed.operation, "readContentJson");

    fixture.respond(() => Response.json({ message: "not found" }, { status: 404 }));
    const missing = await rejection(() => fixture.content.readBytes("missing"));
    assert(missing instanceof NotFoundError, "missing content was not a not-found error");
    assertEquals(missing.operation, "readContentBytes");
    assertEquals(fixture.requests.length, 3);
  });

  Deno.test(`Gitea ${version} blob helpers read bytes, strict UTF-8, and JSON directly by SHA`, async () => {
    const fixture = createFixture(version);
    assertEquals(fixture.blobs.support.operations, {
      get: "direct",
      readBytes: "direct",
      readText: "direct",
      readJson: "direct",
      readBlob: "direct",
    });
    fixture.respond(() => blobResponse(new Uint8Array([0, 255, 65])));
    assertEquals([...await fixture.blobs.readBytes(sha)], [0, 255, 65]);
    fixture.respond(() => blobResponse("\ufeffhéllo 🌍"));
    assertEquals(await fixture.blobs.readText(sha.toUpperCase()), "héllo 🌍");
    fixture.respond(() => blobResponse(""));
    assertEquals(await fixture.blobs.readText(sha), "");
    fixture.respond(() => blobResponse('{"ok":true}'));
    assertEquals(await fixture.blobs.readJson(sha), { ok: true });
    fixture.respond(() => blobResponse("null"));
    assertEquals(await fixture.blobs.readJson(sha), null);
    fixture.respond(() => blobResponse(""));
    assertContentError(
      await rejection(() => fixture.blobs.readJson(sha)),
      "invalid-json",
      "readBlobJson",
      version,
    );
    fixture.respond(() => blobResponse(new Uint8Array([0xff])));
    assertContentError(
      await rejection(() => fixture.blobs.readText(sha)),
      "invalid-utf8",
      "readBlobText",
      version,
    );
    assertContentError(
      await rejection(() => fixture.blobs.readJson(sha)),
      "invalid-utf8",
      "readBlobJson",
      version,
    );
    assertEquals(fixture.requests.length, 8);
    for (const request of fixture.requests) {
      assertEquals(new URL(request.url).pathname, `/api/v1/repos/acme/project/git/blobs/${sha}`);
    }
  });

  Deno.test(`Gitea ${version} body conversions are repeatable defensive snapshots without more requests`, async () => {
    const fixture = createFixture(version);
    fixture.respond(() => fileResponse('{"ok":true}'));
    const content = await fixture.content.read("data.json");
    assertEquals(content.text(), '{"ok":true}');
    assertEquals(content.json(), { ok: true });
    content.bytes!.fill(0);
    new Uint8Array(content.arrayBuffer()).fill(0);
    assertEquals(content.text(), '{"ok":true}');
    fixture.respond(() => blobResponse('{"ok":true}'));
    const blob = await fixture.blobs.get(sha);
    blob.bytes.fill(0);
    new Uint8Array(blob.arrayBuffer()).fill(0);
    assertEquals(blob.text(), '{"ok":true}');
    assertEquals(blob.json(), { ok: true });
    assertEquals(fixture.requests.length, 2);

    fixture.respond(() => fileResponse("metadata only"));
    const metadata = await fixture.content.read("README.md", { includeBytes: false });
    const error = await rejection(() => metadata.text());
    assert(error instanceof ContentReadError, "unloaded body silently became empty text");
    assertEquals(error.reason, "bytes-unavailable");
    assertEquals(fixture.requests.length, 3);
  });

  Deno.test(`Gitea ${version} file and blob helpers preserve cancellation without extra requests`, async () => {
    const fixture = createFixture(version);
    const controller = new AbortController();
    controller.abort();
    for (
      const [operation, read] of [
        [
          "readContentBytes",
          () => fixture.content.readBytes("README.md", { signal: controller.signal }),
        ],
        [
          "readContentText",
          () => fixture.content.readText("README.md", { signal: controller.signal }),
        ],
        [
          "readContentJson",
          () => fixture.content.readJson("README.md", { signal: controller.signal }),
        ],
        ["readBlobBytes", () => fixture.blobs.readBytes(sha, { signal: controller.signal })],
        ["readBlobText", () => fixture.blobs.readText(sha, { signal: controller.signal })],
        ["readBlobJson", () => fixture.blobs.readJson(sha, { signal: controller.signal })],
      ] as const
    ) {
      const error = await rejection(read);
      assert(error instanceof OperationAbortedError, "pre-aborted operation reached transport");
      assertEquals(error.operation, operation);
    }
    assertEquals(fixture.requests.length, 0);

    for (const kind of ["file", "blob"] as const) {
      const during = new AbortController();
      fixture.respond((request) => {
        during.abort();
        assert(request.signal.aborted, "in-flight caller signal was dropped");
        throw new DOMException("Aborted", "AbortError");
      });
      const error = await rejection(() =>
        kind === "file"
          ? fixture.content.readText("README.md", { signal: during.signal })
          : fixture.blobs.readText(sha, { signal: during.signal })
      );
      assert(error instanceof OperationAbortedError, "in-flight abort lost its error type");
      assertEquals(error.operation, kind === "file" ? "readContentText" : "readBlobText");
    }
    assertEquals(fixture.requests.length, 2);
  });

  Deno.test(`Gitea ${version} Web Blob reads pin raw bytes to exact file metadata`, async () => {
    const fixture = createFixture(version);
    const path = "main/images/a picture?#";
    const bytes = new Uint8Array([137, 80, 78, 71, 0, 255, 128]);
    const controller = new AbortController();
    fixture.respond((request) => {
      const url = new URL(request.url);
      if (url.pathname.includes("/contents-ext/")) return fileMetadataResponse(path, bytes);
      return rawFileResponse(bytes, "image/png");
    });
    const blob = await fixture.content.readBlob(path, {
      ref: "feature/read me",
      signal: controller.signal,
    });
    assert(blob instanceof globalThis.Blob, "file helper did not return a standard Web Blob");
    assertEquals(blob.type, "image/png");
    assertEquals(blob.size, bytes.length);
    assertEquals([...new Uint8Array(await blob.arrayBuffer())], [...bytes]);
    assertEquals(fixture.requests.length, 2);
    const metadataUrl = new URL(fixture.requests[0].url);
    const rawUrl = new URL(fixture.requests[1].url);
    assertEquals(
      decodeURIComponent(metadataUrl.pathname),
      `/api/v1/repos/acme/project/contents-ext/${path}`,
    );
    assertEquals(metadataUrl.searchParams.get("ref"), "feature/read me");
    assertEquals(metadataUrl.searchParams.get("includes"), "commit_metadata");
    assertEquals(decodeURIComponent(rawUrl.pathname), `/api/v1/repos/acme/project/raw/${path}`);
    assertEquals(rawUrl.searchParams.get("ref"), lastCommitSha);
    assertEquals(rawUrl.searchParams.has("includes"), false);
    controller.abort();
    assert(
      fixture.requests.every((request) => request.signal.aborted),
      "signal did not reach both requests",
    );
  });

  Deno.test(`Gitea ${version} Web Blobs use reliable MIME headers then shared extension inference`, async () => {
    const fixture = createFixture(version);
    const bytes = new Uint8Array([0, 255, 128]);
    const cases = [
      ["renamed.txt", "image/png", "image/png"],
      ["image.PNG", "application/octet-stream", "image/png"],
      ["index.html", "text/plain; charset=utf-8", "text/html"],
      ["styles.css", "text/plain", "text/css"],
      ["drawing", "image/svg+xml", "image/svg+xml"],
      ["file.json", "application/json", "application/json"],
      ["picture.webp", undefined, "image/webp"],
      ["file.pdf", "not a media type", "application/pdf"],
    ] as const;
    for (const [path, contentType, expected] of cases) {
      fixture.respond((request) =>
        new URL(request.url).pathname.includes("/contents-ext/")
          ? fileMetadataResponse(path, bytes)
          : rawFileResponse(bytes, contentType)
      );
      const blob = await fixture.content.readBlob(path);
      assertEquals(blob.type, expected);
      assertEquals([...new Uint8Array(await blob.arrayBuffer())], [...bytes]);
    }
    assertEquals(fixture.requests.length, cases.length * 2);
  });

  Deno.test(`Gitea ${version} Web Blob unknown types fail explicitly and caller types validate before IO`, async () => {
    const fixture = createFixture(version);
    const bytes = new Uint8Array([0, 255]);
    fixture.respond((request) =>
      new URL(request.url).pathname.includes("/contents-ext/")
        ? fileMetadataResponse("file.pangit-unknown", bytes)
        : rawFileResponse(bytes, "application/octet-stream")
    );
    assertContentError(
      await rejection(() => fixture.content.readBlob("file.pangit-unknown")),
      "unknown-media-type",
      "readContentBlob",
      version,
    );
    const explicit = await fixture.content.readBlob("file.pangit-unknown", {
      type: "application/x-project-image",
    });
    assertEquals(explicit.type, "application/x-project-image");
    const named = await fixture.content.readBlob("file.pangit-unknown", { fileName: "photo.png" });
    assertEquals(named.type, "image/png");
    assertEquals(fixture.requests.length, 6);
    const invalid = await rejection(() =>
      fixture.content.readBlob("file.pangit-unknown", { type: "image" })
    );
    assert(invalid instanceof FluentOperationError, "invalid MIME option did not fail locally");
    assertEquals(fixture.requests.length, 6);
  });

  Deno.test(`Gitea ${version} Web Blob reads reject missing refs and non-files before raw requests`, async () => {
    const fixture = createFixture(version);
    fixture.respond(() => Response.json({ message: "not found" }, { status: 404 }));
    const missing = await rejection(() =>
      fixture.content.readBlob("file.png", { ref: "missing-ref" })
    );
    assert(missing instanceof NotFoundError, "missing ref was not preserved as not found");
    assertEquals(missing.operation, "readContentBlob");
    assertEquals(fixture.requests.length, 1);
    assertEquals(new URL(fixture.requests[0].url).searchParams.get("ref"), "missing-ref");
    for (
      const payload of [
        { dir_contents: [] },
        {
          file_contents: {
            type: "symlink",
            path: "file.png",
            name: "file.png",
            target: "actual.png",
          },
        },
        {
          file_contents: {
            type: "submodule",
            path: "file.png",
            name: "file.png",
            submodule_git_url: "https://external.invalid/repo.git",
          },
        },
      ]
    ) {
      fixture.respond(() => Response.json(payload));
      assertContentError(
        await rejection(() => fixture.content.readBlob("file.png")),
        "not-a-file",
        "readContentBlob",
        version,
      );
    }
    assertEquals(fixture.requests.length, 4);
    assert(
      fixture.requests.every((request) => new URL(request.url).pathname.includes("/contents-ext/")),
      "invalid file read reached raw endpoint",
    );
  });

  Deno.test(`Gitea ${version} Web Blob reads require matching immutable metadata and complete raw files`, async () => {
    const fixture = createFixture(version);
    const bytes = new Uint8Array([0, 255]);
    for (
      const fields of [
        { sha: undefined },
        { last_commit_sha: undefined },
        { last_commit_sha: "main" },
        { path: "different.png" },
      ]
    ) {
      fixture.respond(() => fileMetadataResponse("file.png", bytes, fields));
      const error = await rejection(() => fixture.content.readBlob("file.png"));
      assert(error instanceof ProviderInvariantError, "incomplete file identity was accepted");
      assertEquals(error.operation, "readContentBlob");
    }
    assertEquals(fixture.requests.length, 4);
    for (
      const [headers, status, body] of [
        [{ etag: `"${lastCommitSha}"` }, 200, bytes],
        [{ "x-gitea-object-type": "symlink" }, 200, bytes],
        [{ "x-gitea-object-type": "" }, 200, bytes],
        [{}, 206, bytes],
        [{}, 200, bytes.slice(0, 1)],
      ] as const
    ) {
      fixture.respond((request) =>
        new URL(request.url).pathname.includes("/contents-ext/")
          ? fileMetadataResponse("file.png", bytes)
          : rawFileResponse(body, "image/png", { headers, status })
      );
      const error = await rejection(() => fixture.content.readBlob("file.png"));
      assert(error instanceof ProviderInvariantError, "inconsistent raw response was accepted");
      assertEquals(error.operation, "readContentBlob");
    }
    assertEquals(fixture.requests.length, 14);
  });

  Deno.test(`Gitea ${version} Web Blob cancellation interrupts raw response consumption`, async () => {
    const fixture = createFixture(version);
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    fixture.respond((request) => {
      if (new URL(request.url).pathname.includes("/contents-ext/")) {
        return fileMetadataResponse("file.png", new Uint8Array([0, 255]));
      }
      return new Response(
        new ReadableStream<Uint8Array>({
          start(streamController) {
            streamController.enqueue(new Uint8Array([0]));
            timer = setTimeout(() => controller.abort(), 5);
          },
        }),
        {
          headers: { "content-type": "image/png", "x-gitea-object-type": "file", etag: `"${sha}"` },
        },
      );
    });
    try {
      const error = await rejection(() =>
        fixture.content.readBlob("file.png", { signal: controller.signal })
      );
      assert(error instanceof OperationAbortedError, "raw body cancellation lost abort identity");
      assertEquals(error.operation, "readContentBlob");
      assertEquals(fixture.requests.length, 2);
      const alreadyAborted = await rejection(() =>
        fixture.content.readBlob("file.png", { signal: controller.signal })
      );
      assert(
        alreadyAborted instanceof OperationAbortedError,
        "already-aborted read was not rejected",
      );
      assertEquals(fixture.requests.length, 2);
    } finally {
      clearTimeout(timer);
    }
  });

  Deno.test(`Gitea ${version} Git-object Web Blob reads use caller names without trusting JSON wrapper types`, async () => {
    const fixture = createFixture(version);
    const bytes = new Uint8Array([0, 255, 128]);
    fixture.respond(() => blobResponse(bytes));
    const named = await fixture.blobs.readBlob(sha, { fileName: "image.png" });
    assert(named instanceof globalThis.Blob, "Git object helper did not return Web Blob");
    assertEquals(named.type, "image/png");
    assertEquals([...new Uint8Array(await named.arrayBuffer())], [...bytes]);
    const explicit = await fixture.blobs.readBlob(sha, { type: "image/webp" });
    assertEquals(explicit.type, "image/webp");
    assertContentError(
      await rejection(() => fixture.blobs.readBlob(sha)),
      "unknown-media-type",
      "readBlob",
      version,
    );
    assertEquals(fixture.requests.length, 3);
    const invalid = await rejection(() => fixture.blobs.readBlob(sha, { type: "bad type" }));
    assert(
      invalid instanceof FluentOperationError,
      "invalid Git blob MIME option did not fail locally",
    );
    assertEquals(fixture.requests.length, 3);
  });
}

function createFixture<TVersion extends GiteaVersion>(version: TVersion) {
  const requests: Request[] = [];
  let respond = (_request: Request): Response => fileResponse("default");
  const adapter = new GiteaGitHostAdapter(version, {
    baseUrl: "https://gitea.example.invalid/api/v1",
    fetch(input, init) {
      const request = new Request(input, init);
      requests.push(request);
      return Promise.resolve(respond(request));
    },
  });
  const repository = {
    id: "1",
    owner: "acme",
    name: "project",
    fullName: "acme/project",
    native: {},
  } as RepositoryData<"gitea", TVersion>;
  return {
    requests,
    content: createRepositoryContent(adapter, repository),
    blobs: createRepositoryBlobs(adapter, repository),
    respond(next: (request: Request) => Response) {
      respond = next;
    },
  };
}

function fileResponse(body: string | Uint8Array): Response {
  const bytes = typeof body === "string" ? encoder.encode(body) : body;
  return Response.json({
    file_contents: {
      type: "file",
      path: "README.md",
      name: "README.md",
      sha,
      size: bytes.byteLength,
      encoding: "base64",
      content: encodeBase64(bytes),
    },
  });
}

function blobResponse(body: string | Uint8Array): Response {
  const bytes = typeof body === "string" ? encoder.encode(body) : body;
  return Response.json({
    sha,
    size: bytes.byteLength,
    encoding: "base64",
    content: encodeBase64(bytes),
  });
}

function fileMetadataResponse(
  path: string,
  bytes: Uint8Array,
  fields: Readonly<Record<string, unknown>> = {},
): Response {
  return Response.json({
    file_contents: {
      type: "file",
      path,
      name: path.split("/").at(-1),
      sha,
      size: bytes.byteLength,
      last_commit_sha: lastCommitSha,
      ...fields,
    },
  });
}

function rawFileResponse(
  bytes: Uint8Array,
  contentType?: string,
  options: { readonly headers?: Readonly<Record<string, string>>; readonly status?: number } = {},
): Response {
  return new Response(bytes.slice(), {
    status: options.status ?? 200,
    headers: {
      "x-gitea-object-type": "file",
      etag: `"${sha}"`,
      ...(contentType === undefined ? {} : { "content-type": contentType }),
      ...options.headers,
    },
  });
}

function encodeBase64(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  }
}

async function rejection(read: () => unknown): Promise<unknown> {
  try {
    await read();
  } catch (error) {
    return error;
  }
  throw new Error("expected read to reject");
}

function assertContentError(
  error: unknown,
  reason: ContentReadError["reason"],
  operation: string,
  version: GiteaVersion,
): void {
  assert(error instanceof ContentReadError, `expected content read error, got ${String(error)}`);
  assert(error instanceof FluentOperationError, "conversion error lost fluent error identity");
  assertEquals(error.reason, reason);
  assertEquals(error.operation, operation);
  assertEquals(error.provider, "gitea");
  assertEquals(error.version, version);
}
