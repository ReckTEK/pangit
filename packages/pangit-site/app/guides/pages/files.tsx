import { GuideLink, guideMeta, GuidePage, MethodTable } from "../mod.ts";
import { CodeSnippet } from "../../components/code-snippet.tsx";
import { blobs, body, content } from "../methods/files.ts";

export const meta = guideMeta("files");

export default function Guide() {
  return (
    <GuidePage
      slug="files"
      sections={[
        {
          id: "read",
          title: "Read a file in the format you need",
          content: (
            <>
              <p>
                Use repository-relative paths and a branch, tag, or commit SHA as{" "}
                <code>ref</code>. A SHA makes a multi-step read stable even if the branch moves.
                Paths are not local filesystem paths.
              </p>
              <CodeSnippet file="fluent/file-reads.ts" />
              <p>
                <code>readJson()</code> returns <code>unknown</code>. Invalid UTF-8 or JSON raises
                {" "}
                <code>ContentReadError</code>; missing files and unavailable bodies retain their own
                errors. Direct body reads do not silently follow symlinks or submodules.
              </p>
            </>
          ),
        },
        {
          id: "write",
          title: "Commit several changes together",
          content: (
            <>
              <CodeSnippet file="fluent/file-commit.ts" />
              <p>
                Supply an existing <code>branch</code>, a commit <code>message</code>, and nonempty
                {" "}
                <code>changes</code>. Optional <code>newBranch</code>{" "}
                starts a new branch; omit it to write to the existing branch. Optional{" "}
                <code>author</code> contains name, email, and date fields supported by the provider.
              </p>
              <ul>
                <li>
                  <code>create</code>: a new path and string or byte content.
                </li>
                <li>
                  <code>update</code>: an existing path, replacement content, and optional expected
                  {" "}
                  <code>sha</code>.
                </li>
                <li>
                  <code>upsert</code>: create or update a path.
                </li>
                <li>
                  <code>delete</code>: an existing path and optional expected SHA.
                </li>
                <li>
                  <code>move</code>: <code>fromPath</code>, destination{" "}
                  <code>path</code>, and optional expected SHA.
                </li>
              </ul>
              <p>
                These are mutation operations. A failed response does not prove that no remote
                change occurred; inspect the branch before retrying. See{" "}
                <GuideLink to="providers">the known GitLab branch-cache issue</GuideLink>{" "}
                when writing immediately after branch creation.
              </p>
            </>
          ),
        },
        {
          id: "batches",
          title: "Directories, links, and partial reads",
          content: (
            <>
              <p>
                Batch results preserve input paths. Each entry contains <code>content</code> or an
                {" "}
                <code>unavailable</code>{" "}
                reason: missing, too-large, or not-a-file. Handle each result instead of assuming
                every requested body exists. Permission and transport failures still throw.
              </p>
              <p>
                Metadata can include kind, path, name, SHA, size, target, submodule URL, and
                requested commit metadata. Byte arrays are returned defensively. Symlink and
                submodule reads only dereference when explicitly asked and proven to remain inside
                the provider.
              </p>
              <MethodTable {...content} />
              <p>
                A loaded Content or Git Blob snapshot also provides repeatable synchronous
                conversions. These do not fetch missing bytes; read a body first or handle
                ContentReadError.
              </p>
              <MethodTable {...body} />
            </>
          ),
        },
        {
          id: "blobs",
          title: "Read by Git blob SHA",
          content: (
            <>
              <p>
                <code>repo.blobs</code> is the optional Git-object API. Its <code>get()</code>{" "}
                result is a PanGit entity. In contrast, <code>readBlob()</code>{" "}
                returns the standard web <code>Blob</code> used by Fetch and browser APIs. Supply
                {" "}
                <code>fileName</code> or an explicit <code>type</code>{" "}
                when a SHA has no MIME evidence; <code>type: "application/octet-stream"</code>{" "}
                opts into a binary fallback.
              </p>
              <MethodTable {...blobs} />
            </>
          ),
        },
      ]}
    />
  );
}
