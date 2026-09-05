import { guideMeta, GuidePage, MethodTable } from "../mod.ts";
import { CodeSnippet } from "../../components/code-snippet.tsx";
import { assets, packages, releases } from "../methods/releases-packages.ts";

export const meta = guideMeta("releases-packages");

export default function Guide() {
  return (
    <GuidePage
      slug="releases-packages"
      sections={[
        {
          id: "publish",
          title: "Publish a release and an asset",
          content: (
            <>
              <CodeSnippet file="fluent/release.ts" />
              <p>
                A release is associated with a Git tag. The returned snapshot contains its ID, tag
                name, draft and prerelease flags, and available title, description, author, target,
                timestamps, and URL. Assets carry their own ID, name, and available size, download
                count, and download URL.
              </p>
            </>
          ),
        },
        {
          id: "assets",
          title: "Know the asset lifecycle",
          content: (
            <>
              <p>
                Asset downloads use the returned URL or the native API; a private asset may still
                require authentication. GitLab stores uploads at the project level and exposes
                release links to them. Removing a release asset link does not delete that project
                upload. Signing is native-only.
              </p>
              <MethodTable {...releases} />
              <MethodTable {...assets} />
            </>
          ),
        },
        {
          id: "packages",
          title: "Inspect package versions",
          content: (
            <>
              <p>
                Package operations live on{" "}
                <code>git.packages</code>, because registry ownership may differ from repository
                ownership. Coordinates are <code>owner</code>, <code>type</code>, and{" "}
                <code>name</code>; an exact identity adds{" "}
                <code>version</code>. Gitea and Forgejo use account owners. GitLab uses a project ID
                or its full path.
              </p>
              <p>
                This capability covers metadata and deletion. Publishing and downloading packages
                use registry-specific protocols or native clients. GitLab package lookups are
                bounded to ten pages of 100 records; reaching the scan ceiling is an explicit
                failure, not proof that the version is absent.
              </p>
              <MethodTable {...packages} />
            </>
          ),
        },
      ]}
    />
  );
}
