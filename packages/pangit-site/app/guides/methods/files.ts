import type * as api from "@recktek/pangit/api";
import type { MethodDescriptions } from "../mod.ts";

export const content = {
  title: "repo.content",
  source: "fluent-api/capabilities/RepositoryContent.ts",
  methods: {
    "readText":
      "readText(path, options?) \u2192 string. Load bytes and decode strict UTF-8, removing a BOM. Empty files produce an empty string.",
    "readBytes":
      "readBytes(path, options?) \u2192 Uint8Array. Load independent bytes. Options: ref, includeCommitMetadata, signal.",
    "readJson":
      "readJson(path, options?) \u2192 unknown. Parse UTF-8 JSON; validate the resulting application shape yourself.",
    "readBlob":
      "readBlob(path, options?) \u2192 web Blob. Resolve MIME type from explicit type, provider evidence, or a filename hint. Options also accept type and fileName.",
    "read":
      "read(path, { ref?, includeBytes?, includeCommitMetadata?, signal? }) \u2192 Content. Direct file reads include bytes by default; links and directories are not implicitly followed.",
    "readFiles":
      "readFiles(paths, { ref?, maxItems?, concurrency?, signal? }) \u2192 readonly ContentRead[]. Bounded batch with one result per input; default ceiling is 200 inputs.",
    "getDirectory":
      "getDirectory(path, options?) \u2192 Content. Fetch directory metadata rather than its descendants.",
    "listDirectory":
      "listDirectory(path, options?) \u2192 readonly Content[]. Options: ref, recursive, collapseSingleFolders, maxDepth, maxItems, concurrency, signal. Recursive traversal requires maxDepth and maxItems; folder collapsing requires maxDepth.",
    "readPathMetadataBatch":
      "readPathMetadataBatch(paths, options?) \u2192 readonly ContentRead[]. Read metadata with ref, maxItems, concurrency, and optional compareFirstParent; no implicit file bodies.",
    "readSymlink":
      "readSymlink(path, options?) \u2192 Content. Read link metadata; dereference: internal explicitly requests one proven same-provider target.",
    "readSubmodule":
      "readSubmodule(path, options?) \u2192 Content. Read submodule metadata; the same explicit internal-only dereference policy applies.",
    "commitChanges":
      "commitChanges(input) \u2192 operation. Call execute({ signal? }) to commit the supplied changes and return a Commit.",
  } satisfies MethodDescriptions<api.RepositoryContent<"gitea", "1.27.2">>,
};

export const blobs = {
  title: "repo.blobs",
  source: "fluent-api/capabilities/optional/RepositoryBlobs.ts",
  methods: {
    "get":
      "get(sha, options?) \u2192 Git Blob entity. Read one SHA-addressed object with size, bytes, and native access.",
    "readBytes": "readBytes(sha, options?) \u2192 Uint8Array. Read bytes directly by Git blob SHA.",
    "readText": "readText(sha, options?) \u2192 string. Decode the object as strict UTF-8.",
    "readJson":
      "readJson(sha, options?) \u2192 unknown. Parse JSON without assuming an application schema.",
    "readBlob":
      "readBlob(sha, options?) \u2192 web Blob. SHA-only objects may need type or fileName to resolve their MIME type.",
  } satisfies MethodDescriptions<api.RepositoryBlobs<"gitea", "1.27.2">>,
};

export const body = {
  title: "Loaded Content and Git Blob snapshots",
  source: "fluent-api/adapter-contract/content-body.ts",
  methods: {
    text: "text() → string. Decode already-loaded bytes as strict UTF-8. No HTTP request.",
    json: "json() → unknown. Parse loaded UTF-8 JSON; validate its application shape.",
    arrayBuffer: "arrayBuffer() → ArrayBuffer. Return an independent copy of the loaded bytes.",
    blob:
      "blob({ type?, fileName? }) → web Blob. Resolve a MIME type for loaded bytes; unknown or invalid MIME evidence throws ContentReadError.",
  } satisfies MethodDescriptions<api.ReadableContentBody>,
};
