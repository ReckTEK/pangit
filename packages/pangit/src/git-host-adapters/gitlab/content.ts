import type { GitLabAdapterContext } from "./GitLabAdapterContext.ts";
import type { GitLabVersion } from "./native/GitLabNative.ts";
import type {
  CommitFileChangesInput,
  CommitFileChangesOptions,
  ContentData,
  ReadContentOptions,
} from "../../fluent-api/adapter-contract/content.ts";
import type { BlobData } from "../../fluent-api/adapter-contract/optional/blob-reads.ts";
import {
  ConflictError,
  ContentUnavailableError,
  IncompleteHistoryError,
  NotFoundError,
} from "../../fluent-api/adapter-contract/errors.ts";
import {
  createWebBlob,
  decodeContentText,
  parseContentJson,
  requireContentBytes,
  validateContentBlobOptions,
} from "../../fluent-api/content-body.ts";
import {
  type Adapter,
  batch,
  body,
  call,
  context,
  door,
  type Dto,
  id,
  invalid,
  invariant,
  number,
  object,
  optional,
  page,
  path,
  type Repo,
  required,
  text,
  unavailable,
} from "./shared.ts";
import { commit, commits } from "./commits.ts";

const MAX_DIRECTORY_ENTRIES = 10000;
export function normalizePath(
  c: GitLabAdapterContext<GitLabVersion>,
  value: string,
  allowRoot = false,
): string {
  if (allowRoot && ["", ".", "/"].includes(value)) return "";
  if (
    !value || value.startsWith("/") || value.includes("\\") || value.includes("\0") ||
    value.split("/").some((p) => p === ".." || p === "." || p === "")
  ) invalid(c, "content", "Path must be relative and contain no empty, dot, or parent segments");
  return value;
}
function encode(value: string | Uint8Array): string {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
async function decode(
  c: GitLabAdapterContext<GitLabVersion>,
  p: Dto,
  sha: string,
): Promise<Uint8Array> {
  if (p.encoding !== "base64" || typeof p.content !== "string") {
    throw new ContentUnavailableError(
      "GitLab did not return base64 file bytes",
      context(c, "readContent"),
    );
  }
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(p.content.replaceAll(/\s/g, "")), (x) => x.charCodeAt(0));
  } catch {
    invariant(c, "readContent", "GitLab returned invalid base64");
  }
  if (number(c, "readContent", p.size) !== bytes.length) {
    invariant(c, "readContent", "GitLab content length differs from metadata");
  }
  const prefix = new TextEncoder().encode(`blob ${bytes.length}\0`);
  const data = new Uint8Array(prefix.length + bytes.length);
  data.set(prefix);
  data.set(bytes, prefix.length);
  const digest = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-1", data)),
    (x) => x.toString(16).padStart(2, "0"),
  ).join("");
  if (digest !== sha.toLowerCase()) {
    invariant(c, "readContent", "GitLab blob hash differs from requested object");
  }
  return bytes;
}
async function pin<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  r: Repo<V>,
  ref: string | undefined,
  o: ReadContentOptions,
): Promise<string> {
  if (ref && /^[a-f0-9]{40}$/i.test(ref)) return ref;
  return (await commits(c).getCommit(r, ref ?? r.defaultBranch ?? "HEAD", o)).sha;
}
async function tree<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  r: Repo<V>,
  folder: string,
  ref: string,
  o: { signal?: AbortSignal },
  max = MAX_DIRECTORY_ENTRIES,
): Promise<Dto[]> {
  const result: Dto[] = [];
  let cursor: string | undefined;
  do {
    const p = await page(
      c,
      "listDirectory",
      "getApiV4ProjectsIdRepositoryTree",
      { path: path(r), query: { path: folder, ref, recursive: false } },
      { limit: Math.min(100, max - result.length + 1), cursor, ...o },
      (p) => p,
    );
    result.push(...p.items);
    if (result.length > max) {
      throw new IncompleteHistoryError(
        "Directory exceeds its caller-selected entry bound",
        context(c, "listDirectory"),
      );
    }
    cursor = p.nextCursor;
  } while (cursor);
  return result;
}
async function entry<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  r: Repo<V>,
  name: string,
  ref: string,
  o: { signal?: AbortSignal },
): Promise<Dto> {
  const folder = name.slice(0, Math.max(0, name.lastIndexOf("/")));
  const found = (await tree(c, r, folder, ref, o)).find((e) => e.path === name);
  if (!found) {
    throw new NotFoundError("Repository path was not found", {
      ...context(c, "readContent"),
      status: 404,
    });
  }
  return found;
}
async function treeContent<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  p: Dto,
): Promise<ContentData<"gitlab", V>> {
  const mode = required(c, "readContent", p.mode);
  const kind = mode === "120000"
    ? "symlink"
    : mode === "160000"
    ? "submodule"
    : p.type === "tree"
    ? "directory"
    : "file";
  return Object.freeze({
    kind,
    path: required(c, "readContent", p.path),
    name: required(c, "readContent", p.name),
    sha: id(c, "readContent", p.id),
    native: await door(c, "content", p),
  });
}
export async function getBlob<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  r: Repo<V>,
  sha: string,
  o: { signal?: AbortSignal } = {},
): Promise<BlobData<"gitlab", V>> {
  if (!/^[a-f0-9]{40}$/i.test(sha)) invalid(c, "getBlob", "Git blob ID must be a full SHA-1");
  const p = object(
    c,
    "getBlob",
    (await call(
      c,
      "getBlob",
      "getApiV4ProjectsIdRepositoryBlobsSha",
      { path: { ...path(r), sha } },
      o,
    )).body,
  );
  // GitLab's blob endpoint does not echo the requested SHA. Verify the decoded object hash.
  const bytes = await decode(c, p, sha);
  return Object.freeze({
    sha: sha.toLowerCase(),
    size: bytes.length,
    bytes,
    native: await door(c, "blob", p),
  });
}
export async function readContent<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  r: Repo<V>,
  name: string,
  o: ReadContentOptions = {},
): Promise<ContentData<"gitlab", V>> {
  name = normalizePath(c, name, true);
  const ref = await pin(c, r, o.ref, o);
  if (name === "") {
    const values = await tree(c, r, "", ref, o);
    return Object.freeze({
      kind: "directory",
      path: "",
      name: "",
      native: await door(c, "content", values),
    });
  }
  const p = await entry(c, r, name, ref, o);
  const meta = await treeContent(c, p);
  if (meta.kind === "directory" || meta.kind === "submodule") return meta;
  const blob = o.includeBytes !== false || meta.kind === "symlink"
    ? await getBlob(c, r, meta.sha!, o)
    : undefined;
  let lastCommitSha: string | undefined;
  if (o.includeCommitMetadata) {
    const f = object(
      c,
      "readContent",
      (await call(c, "readContent", "getApiV4ProjectsIdRepositoryFilesFilePath", {
        path: { ...path(r), file_path: name },
        query: { ref },
      }, o)).body,
    );
    lastCommitSha = text(f.last_commit_id);
  }
  return Object.freeze({
    ...meta,
    ...(meta.kind === "symlink"
      ? { target: decodeContentText(blob!.bytes, context(c, "readSymlink")) }
      : blob
      ? { bytes: blob.bytes, size: blob.size }
      : {}),
    lastCommitSha,
  });
}
export async function commitFiles<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  r: Repo<V>,
  i: CommitFileChangesInput,
  o: CommitFileChangesOptions<"gitlab"> = {},
) {
  if (i.author?.date !== undefined) {
    unavailable(
      c,
      "commitFileChanges",
      "GitLab does not accept author dates in atomic file commits",
    );
  }
  if (o.extension?.startSha !== undefined && !i.newBranch) {
    invalid(c, "commitFileChanges", "startSha requires newBranch");
  }
  if (o.extension?.startSha !== undefined && !/^[a-f0-9]{40}$/i.test(o.extension.startSha)) {
    invalid(c, "commitFileChanges", "startSha must be a full commit SHA");
  }
  const seen = new Set<string>();
  for (const change of i.changes) {
    normalizePath(c, change.path);
    if (seen.has(change.path)) invalid(c, "commitFileChanges", "Duplicate change path");
    seen.add(change.path);
    if (change.operation === "move") normalizePath(c, change.fromPath);
  }
  // Resolve upserts and optimistic blob preconditions before issuing the single atomic commit.
  const actions = await batch(
    c,
    "commitFileChanges",
    i.changes,
    { maxItems: 100, concurrency: 4 },
    100,
    async (change) => {
      let action = change.operation;
      let last_commit_id: string | undefined;
      if (action === "upsert" || "sha" in change && change.sha !== undefined) {
        const oldPath = change.operation === "move" ? change.fromPath : change.path;
        const response = await optional(() =>
          call(c, "commitFileChanges.preflight", "getApiV4ProjectsIdRepositoryFilesFilePath", {
            path: { ...path(r), file_path: oldPath },
            query: { ref: i.branch },
          }, o)
        );
        const old = response ? object(c, "commitFileChanges", response.body) : undefined;
        if (
          "sha" in change && change.sha !== undefined && old?.blob_id !== change.sha
        ) {
          throw new ConflictError(
            "File changed since the supplied blob SHA",
            context(c, "commitFileChanges"),
          );
        }
        if (action === "upsert") action = old ? "update" : "create";
        last_commit_id = text(old?.last_commit_id);
      }
      return {
        action: action as "create" | "update" | "delete" | "move",
        file_path: change.path,
        ...("content" in change
          ? { content: encode(change.content), encoding: "base64" as const }
          : {}),
        ...(change.operation === "move" ? { previous_path: change.fromPath } : {}),
        ...(last_commit_id ? { last_commit_id } : {}),
      };
    },
  );
  const response = await call(c, "commitFileChanges", "postApiV4ProjectsIdRepositoryCommits", {
    path: path(r),
    body: body({
      branch: i.newBranch ?? i.branch,
      ...(i.newBranch
        ? o.extension?.startSha ? { start_sha: o.extension.startSha } : { start_branch: i.branch }
        : {}),
      force: o.extension?.force,
      commit_message: i.message,
      actions: [...actions],
      author_name: i.author?.name,
      author_email: i.author?.email,
    }),
  }, o);
  return await commit(c, object(c, "commitFileChanges", response.body));
}
export function content<V extends GitLabVersion>(c: GitLabAdapterContext<V>) {
  const ops: Pick<
    Adapter<V>,
    | "readContent"
    | "readContentBytes"
    | "readContentText"
    | "readContentJson"
    | "readContentBlob"
    | "readFiles"
    | "getDirectory"
    | "listDirectory"
    | "readPathMetadataBatch"
    | "readSymlink"
    | "readSubmodule"
    | "commitFileChanges"
    | "getBlob"
    | "readBlob"
    | "readBlobBytes"
    | "readBlobText"
    | "readBlobJson"
    | "blobReadSupport"
  > = {
    blobReadSupport: Object.freeze({
      supported: true,
      operations: Object.freeze({
        get: "direct",
        readBytes: "direct",
        readText: "direct",
        readJson: "direct",
        readBlob: "direct",
      }),
    }),
    readContent: (r, p, o) => readContent(c, r, p, o),
    readContentBytes: async (r, p, o) =>
      requireContentBytes(
        await readContent(c, r, p, { ...o, includeBytes: true }),
        context(c, "readContentBytes"),
      ),
    readContentText: async (r, p, o) =>
      decodeContentText(await ops.readContentBytes(r, p, o), context(c, "readContentText")),
    readContentJson: async (r, p, o) =>
      parseContentJson(await ops.readContentBytes(r, p, o), context(c, "readContentJson")),
    readContentBlob: async (r, p, o = {}) => {
      validateContentBlobOptions(o, context(c, "readContentBlob"));
      return createWebBlob(
        await readContent(c, r, p, { ...o, includeBytes: true }),
        o,
        context(c, "readContentBlob"),
      );
    },
    readFiles: async (r, paths, o = {}) => {
      paths.forEach((p) => normalizePath(c, p));
      if (paths.length > (o.maxItems ?? 200)) invalid(c, "readFiles", "Batch exceeds maxItems");
      if (paths.length === 0) return Object.freeze([]);
      const ref = await pin(c, r, o.ref, o);
      return await batch(c, "readFiles", paths, o, 200, async (p) => {
        try {
          const result = await readContent(c, r, p, { ...o, ref });
          return result.kind === "file"
            ? Object.freeze({ path: p, content: result })
            : Object.freeze({ path: p, unavailable: "not-a-file" as const });
        } catch (e) {
          if (e instanceof NotFoundError) {
            return Object.freeze({ path: p, unavailable: "missing" as const });
          }
          if (e instanceof ContentUnavailableError) {
            return Object.freeze({ path: p, unavailable: "too-large" as const });
          }
          throw e;
        }
      });
    },
    getDirectory: async (r, p, o) => {
      const result = await readContent(c, r, p, { ...o, includeBytes: false });
      if (result.kind !== "directory") invalid(c, "getDirectory", "Path is not a directory");
      return result;
    },
    listDirectory: async (r, p, o = {}) => {
      p = normalizePath(c, p, true);
      if ((o.recursive || o.collapseSingleFolders) && !o.maxDepth || o.recursive && !o.maxItems) {
        invalid(c, "listDirectory", "Recursive/collapsed reads require maxDepth and maxItems");
      }
      const ref = await pin(c, r, o.ref, o);
      const max = o.maxItems ?? MAX_DIRECTORY_ENTRIES;
      const values: ContentData<"gitlab", V>[] = [];
      const visit = async (folder: string, depth: number): Promise<void> => {
        const rows = await tree(c, r, folder, ref, o, max - values.length);
        if (
          o.collapseSingleFolders && depth < (o.maxDepth ?? 0) && rows.length === 1 &&
          rows[0].type === "tree"
        ) {
          await visit(required(c, "listDirectory", rows[0].path), depth + 1);
          return;
        }
        for (const p of rows) {
          const meta = await treeContent(c, p);
          values.push(meta);
          if (values.length > max) {
            throw new IncompleteHistoryError(
              "Directory traversal exceeded maxItems",
              context(c, "listDirectory"),
            );
          }
          if (o.recursive && meta.kind === "directory" && depth < (o.maxDepth ?? 0)) {
            await visit(meta.path, depth + 1);
          }
        }
      };
      await visit(p, 0);
      return Object.freeze(values);
    },
    readPathMetadataBatch: async (r, paths, o = {}) => {
      paths.forEach((p) => normalizePath(c, p));
      if (paths.length > (o.maxItems ?? 200)) {
        invalid(c, "readPathMetadataBatch", "Batch exceeds maxItems");
      }
      if (paths.length === 0) return Object.freeze([]);
      const ref = await pin(c, r, o.ref, o);
      const parent = o.compareFirstParent
        ? (await commits(c).getCommit(r, ref, o)).parents[0]
        : undefined;
      return await batch(c, "readPathMetadataBatch", paths, o, 200, async (p) => {
        const value = await optional(() =>
          readContent(c, r, p, { ...o, ref, includeBytes: false, includeCommitMetadata: true })
        );
        if (!value) return { path: p, unavailable: "missing" as const };
        const before = parent ? await optional(() => entry(c, r, p, parent, o)) : undefined;
        return {
          path: p,
          content: Object.freeze({
            ...value,
            firstParentSha: before ? id(c, "readPathMetadataBatch", before.id) : undefined,
          }),
        };
      });
    },
    readSymlink: async (r, p, o = {}) => {
      const ref = await pin(c, r, o.ref, o);
      const link = await readContent(c, r, p, { ...o, ref });
      if (link.kind !== "symlink") invalid(c, "readSymlink", "Path is not a symlink");
      if (!o.dereference) return link;
      const pieces = p.split("/").slice(0, -1);
      if (link.target?.startsWith("/")) {
        unavailable(c, "readSymlink", "Symlink target escapes repository");
      }
      for (const piece of (link.target ?? "").split("/")) {
        if (piece === "..") {
          if (!pieces.length) unavailable(c, "readSymlink", "Symlink target escapes repository");
          pieces.pop();
        } else if (piece !== "." && piece !== "") pieces.push(piece);
      }
      const target = await readContent(c, r, pieces.join("/"), { ...o, ref });
      if (target.kind !== "file") {
        invalid(c, "readSymlink", "Only one internal file target can be dereferenced");
      }
      return Object.freeze({ ...link, dereferenced: target });
    },
    readSubmodule: async (r, p, o = {}) => {
      const ref = await pin(c, r, o.ref, o);
      const link = await readContent(c, r, p, { ...o, ref });
      if (link.kind !== "submodule") invalid(c, "readSubmodule", "Path is not a submodule");
      const config = await ops.readContentText(r, ".gitmodules", { ...o, ref });
      let currentPath: string | undefined;
      let submoduleUrl: string | undefined;
      for (const section of config.split(/^\s*\[submodule /m).slice(1)) {
        currentPath = /^\s*path\s*=\s*(.+)$/m.exec(section)?.[1]?.trim();
        if (currentPath === p) {
          submoduleUrl = /^\s*url\s*=\s*(.+)$/m.exec(section)?.[1]?.trim();
          break;
        }
      }
      if (!o.dereference) return Object.freeze({ ...link, submoduleUrl });
      if (!submoduleUrl) invalid(c, "readSubmodule", "Submodule URL is missing");
      const root = c.webBaseUrl();
      const relativeBase = new URL(`${r.fullName}.git/`, root);
      const url = new URL(submoduleUrl, relativeBase);
      if (
        url.origin !== root.origin || url.username || url.password ||
        !url.pathname.startsWith(root.pathname) || url.search || url.hash
      ) {
        unavailable(c, "readSubmodule", "Submodule target is not internal to this provider");
      }
      const full = decodeURIComponent(url.pathname.slice(root.pathname.length)).replace(
        /\.git$/,
        "",
      );
      normalizePath(c, full);
      const { repository } = await import("./repositories.ts");
      const target = await repository(
        c,
        object(
          c,
          "readSubmodule",
          (await call(c, "readSubmodule", "getApiV4ProjectsId", { path: { id: full } }, o)).body,
        ),
      );
      return Object.freeze({
        ...link,
        submoduleUrl,
        dereferenced: await readContent(c, target, "", { ...o, ref: link.sha }),
      });
    },
    commitFileChanges: (r, i, o) => commitFiles(c, r, i, o),
    getBlob: (r, sha, o) => getBlob(c, r, sha, o),
    readBlobBytes: async (r, sha, o) => (await getBlob(c, r, sha, o)).bytes.slice(),
    readBlobText: async (r, sha, o) =>
      decodeContentText(await ops.readBlobBytes(r, sha, o), context(c, "readBlobText")),
    readBlobJson: async (r, sha, o) =>
      parseContentJson(await ops.readBlobBytes(r, sha, o), context(c, "readBlobJson")),
    readBlob: async (r, sha, o = {}) => {
      validateContentBlobOptions(o, context(c, "readBlob"));
      return createWebBlob(await getBlob(c, r, sha, o), o, context(c, "readBlob"));
    },
  };
  return ops;
}
