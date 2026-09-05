import { GitLabOAuthFixture } from "./GitLabOAuthFixture.ts";
import { createClient } from "../../../../../packages/pangit/src/fluent-client/mod.ts";
import { GitLabE2EFixtureDriver } from "./GitLabE2EFixtureDriver.ts";

const contracts = {
  "core/authentication": async (f: GitLabE2EFixtureDriver) => {
    const root = await createClient("gitlab", f.version, {
      baseUrl: `${f.apiUrl}/api/v4`,
      beforeRequest: f.recorder.beforeRequest,
    });
    const client = await f.prove("token verifies current user once", [
      "gitlab-supplement:GET:/user",
    ], () => root.auth.token(f.token));
    f.equal((await client.currentUserProfile.current()).username, "root", "Verified identity");
    await f.prove(
      "Basic is unsupported before HTTP",
      [],
      () =>
        f.rejects(
          () => root.auth.basic({ username: "root", password: "invalid" }).authorize(),
          "CapabilityUnavailableError",
        ),
    );
    await f.rejects(() => root.auth.token("invalid-token"), "AuthenticationError");
    await f.prove("Construction and native access are lazy", [], async () => {
      const same = await createClient("gitlab", f.version, {
        baseUrl: f.apiUrl,
        beforeRequest: f.recorder.beforeRequest,
      });
      await same.native.gitlab(({ client }) => {
        f.assert(
          typeof client.getApiV4Projects === "function",
          "Exact GitLab native client available",
        );
      });
    });
  },
  "core/oauth": async (f: GitLabE2EFixtureDriver) => {
    const callbackUrl = "http://127.0.0.1/pangit-callback";
    const app = await f.raw("POST", "/applications", {
      name: f.prefix,
      redirect_uri: callbackUrl,
      scopes: "api read_user",
      confidential: true,
    });
    try {
      const root = await createClient("gitlab", f.version, {
        baseUrl: f.apiUrl,
        beforeRequest: f.recorder.beforeRequest,
      });
      const login = root.auth.login({
        clientId: String(app.application_id),
        clientSecret: String(app.secret),
        callbackUrl,
        scopes: ["api", "read_user"],
      });
      const start = await f.prove("OAuth begin performs no HTTP", [], () => login.start());
      f.equal(start.url.searchParams.get("code_challenge_method"), "S256", "PKCE uses SHA-256");
      const browser = new GitLabOAuthFixture(f.apiUrl, "root", f.password);
      await browser.login();
      const callback = await browser.authorize(start.url);
      const authorized = await login.authorize(callback, start.transaction);
      f.equal(
        (await authorized.currentUserProfile.current()).username,
        "root",
        "Real OAuth code exchange verifies identity",
      );
      f.assert(
        authorized.authorization.accessToken && authorized.authorization.refreshToken,
        "OAuth token metadata retained",
      );
      await f.prove(
        "OAuth wrong state fails before transport",
        [],
        () =>
          f.rejects(() =>
            login.authorize(
              new Request(`${callbackUrl}?state=wrong&code=ignored`),
              start.transaction,
            ), "OAuthCallbackError"),
      );
    } finally {
      await f.raw("DELETE", `/applications/${app.id}`);
    }
  },
  "gitlab-extension/operations": async (f: GitLabE2EFixtureDriver) => {
    const repo = await f.project();
    const base = (await repo.branches.get("main")).sha;
    let configured = 0;
    const op = repo.content.commitChanges({
      branch: "main",
      newBranch: "extension",
      message: "extension commit",
      changes: [{ operation: "create", path: "extension.txt", content: "extension" }],
    });
    const commit = await op.gitlab((context) => {
      configured++;
      f.equal(context.repositoryFullName, repo.fullName, "Extension callback context");
      return { startSha: base };
    }).execute();
    f.equal(configured, 1, "Extension callback evaluated once");
    f.equal(commit.parents, [base], "Native start SHA honored");
    const ref = { kind: "commit" as const, sha: commit.sha };
    const state = await repo.statuses.set(ref, { context: "native/state", state: "pending" })
      .gitlab(() => ({ state: "running" })).execute();
    f.equal(state.providerState, "running", "Native GitLab status preserved");
    f.equal(state.state, undefined, "Native running is not invented as portable pending");
    await repo.statuses.set(ref, { context: "native/state", state: "success" }).execute();
    const pr = await repo.pullRequests.create({
      title: "Extension merge",
      source: { owner: "root", repository: repo.name, branch: "extension" },
      targetBranch: "main",
    });
    const merged = await repo.pullRequests.merge(pr, { method: "squash" }).gitlab(() => ({
      headCommitId: commit.sha,
      squashMessage: "Custom squash",
      mergeMessage: "Custom merge",
    })).execute();
    f.assert(merged.merged, "Native merge controls complete merge");
  },
  "core/repositories": async (f: GitLabE2EFixtureDriver) => {
    const client = await f.client();
    const owner = await f.prove(
      "namespace direct lookup",
      ["getApiV4NamespacesId"],
      () => client.container("root"),
    );
    f.equal(owner.kind, "user", "Root is a user namespace");
    const repo = await owner.createRepository(`${f.prefix}-created`, {
      private: true,
      files: [{ path: "hello.txt", content: "世界\n" }],
      defaultBranch: "main",
    });
    f.projects.push(repo.id);
    f.equal(repo.defaultBranch, "main", "Initial files create default branch");
    f.equal(
      await repo.content.readText("hello.txt"),
      "世界\n",
      "Initial contents survive encoding",
    );
    f.assert(await owner.hasRepository(repo.name), "Repository exists");
    f.equal(
      await owner.findRepository(`${f.prefix}-missing`),
      undefined,
      "Missing repository is optional",
    );
    const page = await owner.repositories({ limit: 1 });
    f.equal(page.items.length, 1, "Repository listing respects page size");
    f.assert(page.nextCursor, "Repository listing exposes continuation");
    const next = await owner.repositories({ limit: 1, cursor: page.nextCursor });
    f.assert(
      next.items[0].id !== page.items[0].id,
      "Continuation does not repeat first repository",
    );
    const renamed = await repo.rename(`${repo.name}-renamed`);
    f.assert(renamed.name !== repo.name, "Rename returns a new immutable snapshot");
    await renamed.delete();
    f.projects.splice(f.projects.indexOf(repo.id), 1);
  },
  "core/forks": async (f: GitLabE2EFixtureDriver) => {
    const repo = await f.project();
    const group = await f.group();
    const nested = await f.group("nested", group.id);
    f.assert(nested.name.includes("/"), "Nested namespace retains full path");
    const fork = await repo.forks.create({
      destination: nested,
      name: `${f.prefix}-fork`,
      timeoutMs: 60_000,
      pollIntervalMs: 500,
    });
    f.projects.push(fork.id);
    f.equal(fork.parent?.fullName, repo.fullName, "Fork parent identity retained");
    f.equal(
      (await fork.branches.get("main")).sha,
      (await repo.branches.get("main")).sha,
      "Fork is usable when create resolves",
    );
    f.assert(
      (await repo.forks.list({ limit: 10 })).items.some((p) => p.id === fork.id),
      "Fork listing contains created fork",
    );
  },
  "core/branches": async (f: GitLabE2EFixtureDriver) => {
    const repo = await f.project();
    const main = await f.prove("Branch lookup is direct", [
      "getApiV4ProjectsIdRepositoryBranchesBranch",
    ], () => repo.branches.get("main"));
    const branch = await repo.branches.create({ name: "feature/encoded", source: main.sha });
    f.equal(branch.sha, main.sha, "Branch created at exact commit");
    await f.commit(repo.id, branch.name, "feature.txt", "feature\n");
    await f.commit(repo.id, "main", "main.txt", "main\n");
    const d = await repo.branches.divergence("main", branch.name);
    f.equal([d.ahead, d.behind], [1, 1], "Divergence compares both directions");
    await f.prove(
      "Unsafe branch rename rejects before HTTP",
      [],
      () =>
        f.rejects(
          () => repo.branches.rename(branch, "feature/renamed"),
          "CapabilityUnavailableError",
        ),
    );
    f.assert(
      await repo.branches.exists(branch.name),
      "Unsupported rename preserves original branch",
    );
    f.assert(!await repo.branches.exists("feature/renamed"), "Unsupported rename creates no ref");
    await repo.branches.delete(branch);
    f.assert(!await repo.branches.exists(branch.name), "Delete removes branch");
  },
  "core/tags": async (f: GitLabE2EFixtureDriver) => {
    const repo = await f.project();
    const sha = (await repo.branches.get("main")).sha;
    const tag = await repo.tags.create({
      name: "v1/encoded",
      target: sha,
      message: "annotated tag",
    });
    f.equal(tag.sha, sha, "Annotated tag points to commit");
    f.equal(
      (await f.prove(
        "Tag lookup is direct",
        ["getApiV4ProjectsIdRepositoryTagsTagName"],
        () => repo.tags.get(tag.name),
      )).name,
      tag.name,
      "Encoded tag lookup",
    );
    f.equal((await repo.tags.list({ limit: 1 })).items.length, 1, "Tags one-page listing");
    await repo.tags.delete(tag);
    await f.rejects(() => repo.tags.get(tag.name), "NotFoundError");
  },
  "core/commits": async (f: GitLabE2EFixtureDriver) => {
    const repo = await f.project();
    const base = (await repo.branches.get("main")).sha;
    const sha = await f.commit(repo.id, "main", "history.txt", "line\n");
    const commit = await f.prove(
      "commit direct get",
      ["getApiV4ProjectsIdRepositoryCommitsSha"],
      () => repo.commits.get(sha),
    );
    f.equal(commit.parents, [base], "Commit parent graph retained");
    const facets = await repo.commits.get(sha, { stats: true, files: true, verification: true });
    f.equal(facets.files?.[0].path, "history.txt", "Optional diff facet");
    f.equal(facets.additions, 1, "Optional statistics facet");
    f.equal(facets.verified, false, "Unsigned commit verification");
    const many = await f.prove("Duplicate commit gets are deduplicated", [
      "getApiV4ProjectsIdRepositoryCommitsSha",
      "getApiV4ProjectsIdRepositoryCommitsSha",
    ], () => repo.commits.getMany([sha, base, sha]));
    f.equal(many.map((c) => c.sha), [sha, base, sha], "Batch preserves input order and duplicates");
    const comparison = await repo.commits.compare(base, sha).execute();
    f.equal(comparison.commits.map((c) => c.sha), [sha], "Compare yields exact range");
    f.equal(await repo.commits.countReachable(sha, base), 1, "Reachable difference");
    f.equal(await repo.commits.countReachable(sha), 2, "Full reachable count");
    f.equal(
      (await repo.commits.mergeBases(base, sha, { maxItems: 10, maxRequests: 10 })).commits.map((
        c,
      ) => c.sha),
      [base],
      "Merge bases complete",
    );
    const refs = await repo.commits.findRefs(sha, { kinds: ["branch"], match: "head", limit: 10 });
    f.assert(
      refs.items.some((r) => r.name === "main" && r.sha === sha),
      "Head refs resolve exact SHA",
    );
    const contributors = await repo.commits.contributors({ maxItems: 10, limit: 10 });
    f.assert(contributors.complete, "Bounded contributor slice reports completeness");
    const page = await repo.commits.list({ limit: 1 });
    f.assert(page.nextCursor, "Commit page retains continuation");
    f.equal(
      (await repo.commits.list({ cursor: page.nextCursor, limit: 1 })).items[0].sha,
      base,
      "Commit continuation",
    );
  },
  "core/commit-files-pagination": async (f: GitLabE2EFixtureDriver) => {
    const repo = await f.project();
    const changes = Array.from({ length: 101 }, (_, i) => ({
      operation: "create" as const,
      path: `many/${String(i).padStart(3, "0")}.txt`,
      content: `file ${i}\n`,
    }));
    // Seed a commit above the portable write-batch bound to exercise read pagination.
    const commit = await f.raw("POST", `/projects/${repo.id}/repository/commits`, {
      branch: "main",
      commit_message: "Create 101 files",
      actions: changes.map((change) => ({
        action: "create",
        file_path: change.path,
        content: change.content,
      })),
    });
    const files = await f.prove("Commit files traverse both provider pages", [
      "getApiV4ProjectsIdRepositoryCommitsShaDiff",
      "getApiV4ProjectsIdRepositoryCommitsShaDiff",
    ], () => repo.commits.files(String(commit.id)));
    f.equal(
      files.map((file) => file.path).sort(),
      changes.map((change) => change.path),
      "All 101 files are returned exactly once",
    );
  },
  "core/content-reads": async (f: GitLabE2EFixtureDriver) => {
    const repo = await f.project();
    await repo.content.commitChanges({
      branch: "main",
      message: "content",
      changes: [
        { operation: "create", path: "unicodé-文件.txt", content: "世界 🌍\n" },
        { operation: "create", path: "binary.bin", content: new Uint8Array([0, 128, 255]) },
        { operation: "create", path: "empty.txt", content: "" },
        { operation: "create", path: "config.json", content: '{"ok":true}' },
        { operation: "create", path: "nested/deep/file.txt", content: "nested" },
      ],
    }).execute();
    f.equal(
      await repo.content.readText("unicodé-文件.txt"),
      "世界 🌍\n",
      "UTF-8 path and body round trip",
    );
    f.equal(
      [...await repo.content.readBytes("binary.bin")],
      [0, 128, 255],
      "Binary bytes remain exact",
    );
    f.equal(await repo.content.readText("empty.txt"), "", "Empty file is present");
    f.equal(await repo.content.readJson("config.json"), { ok: true }, "JSON body decoding");
    f.equal(
      (await repo.content.readBlob("config.json")).type,
      "application/json",
      "Blob MIME type",
    );
    const batch = await repo.content.readFiles(["empty.txt", "missing.txt", "nested", "empty.txt"]);
    f.equal(
      batch.map((r) => r.unavailable ?? "file"),
      ["file", "missing", "not-a-file", "file"],
      "Batch distinguishes missing files and directories",
    );
    const entries = await repo.content.listDirectory("", {
      recursive: true,
      maxDepth: 3,
      maxItems: 30,
    });
    f.assert(
      entries.some((e) => e.path === "nested/deep/file.txt"),
      "Bounded recursive tree traversal",
    );
    f.equal((await repo.content.getDirectory(".")).kind, "directory", "Root directory alias");
    const metadata = await repo.content.readPathMetadataBatch(["empty.txt"], {
      compareFirstParent: true,
    });
    f.assert(metadata[0].content?.lastCommitSha, "Path metadata includes latest modifying commit");
  },
  "core/file-changes": async (f: GitLabE2EFixtureDriver) => {
    const repo = await f.project();
    const first = await repo.content.commitChanges({
      branch: "main",
      message: "atomic create",
      changes: [{ operation: "create", path: "one.txt", content: "one" }, {
        operation: "create",
        path: "two.txt",
        content: "two",
      }],
    }).execute();
    const one = await repo.content.read("one.txt");
    await repo.content.commitChanges({
      branch: "main",
      newBranch: "changes",
      message: "atomic edit",
      changes: [
        { operation: "update", path: "one.txt", content: "changed", sha: one.sha },
        { operation: "move", fromPath: "two.txt", path: "moved.txt" },
        { operation: "upsert", path: "upsert.txt", content: "new" },
      ],
    }).execute();
    f.equal(
      await repo.content.readText("one.txt", { ref: "main" }),
      "one",
      "New-branch commit preserves source",
    );
    f.equal(
      await repo.content.readText("one.txt", { ref: "changes" }),
      "changed",
      "Update guards file SHA",
    );
    f.equal(
      await repo.content.readText("moved.txt", { ref: "changes" }),
      "two",
      "Move retains content",
    );
    await f.rejects(
      () =>
        repo.content.commitChanges({
          branch: "changes",
          message: "stale",
          changes: [{ operation: "update", path: "one.txt", sha: one.sha, content: "bad" }],
        }).execute(),
      "ConflictError",
    );
    f.equal(
      (await repo.commits.get(first.sha)).message.trim(),
      "atomic create",
      "Atomic changes form one commit",
    );
    await repo.content.commitChanges({
      branch: "changes",
      message: "delete",
      changes: [{ operation: "delete", path: "moved.txt" }],
    }).execute();
    f.equal(
      (await repo.content.readFiles(["moved.txt"], { ref: "changes" }))[0].unavailable,
      "missing",
      "Delete removes content",
    );
  },
  "core/links": async (f: GitLabE2EFixtureDriver) => {
    const repo = await (await (await f.client()).container("root")).repository("e2e-links");
    const link = await repo.content.readSymlink("link.txt");
    f.equal(link.target, "target.txt", "Symlink target read as metadata");
    f.equal(link.dereferenced, undefined, "No implicit symlink dereference");
    const target = await repo.content.readSymlink("link.txt", { dereference: "internal" });
    f.equal(
      new TextDecoder().decode(target.dereferenced?.bytes),
      "symlink-target\n",
      "Explicit internal symlink resolves bytes",
    );
    await f.rejects(
      () => repo.content.readSymlink("escape.txt", { dereference: "internal" }),
      "CapabilityUnavailableError",
    );
    const sub = await repo.content.readSubmodule("vendor/internal", { dereference: "internal" });
    f.equal(sub.dereferenced?.kind, "directory", "Internal gitlink resolves pinned target");
    await f.rejects(
      () => repo.content.readSubmodule("vendor/external", { dereference: "internal" }),
      "CapabilityUnavailableError",
    );
  },
  "core/pull-requests": async (f: GitLabE2EFixtureDriver) => {
    const repo = await f.project();
    await repo.branches.create({ name: "feature", source: "main" });
    await f.commit(repo.id, "feature", "change.txt", "changed\n");
    const pr = await repo.pullRequests.create({
      title: "PanGit MR",
      description: "body",
      source: { owner: "root", repository: repo.name, branch: "feature" },
      targetBranch: "main",
    });
    f.equal(pr.state, "open", "Opened merge request normalization");
    f.equal(
      (await repo.pullRequests.find({ base: "main", head: "feature" }))?.number,
      pr.number,
      "Find open merge request",
    );
    f.equal(
      (await repo.pullRequests.list({ query: "PanGit", limit: 10 })).items.length,
      1,
      "Text search finds MR",
    );
    await f.eventually(
      () => f.raw("GET", `/projects/${repo.id}/merge_requests/${pr.number}`),
      (p) => !!p.diff_refs,
      "MR commit diff ready",
    );
    f.equal((await repo.pullRequests.commits(pr)).items.length, 1, "MR commit page");
    f.equal((await repo.pullRequests.files(pr)).items[0].path, "change.txt", "MR diff page");
    const updated = await repo.pullRequests.update(pr, { title: "Updated MR" });
    f.equal(updated.title, "Updated MR", "MR update returns fresh snapshot");
    f.equal((await repo.pullRequests.close(updated)).state, "closed", "MR close transition");
  },
  "core/pull-request-merge": async (f: GitLabE2EFixtureDriver) => {
    const repo = await f.project();
    await repo.branches.create({ name: "feature", source: "main" });
    await f.commit(repo.id, "feature", "merge.txt", "merge\n");
    const pr = await repo.pullRequests.create({
      title: "Merge me",
      source: { owner: "root", repository: repo.name, branch: "feature" },
      targetBranch: "main",
    });
    const merged = await repo.pullRequests.merge(pr, { method: "squash", deleteSourceBranch: true })
      .execute();
    f.assert(
      merged.merged && merged.mergeCommitSha,
      "Merge waits for actual completion and commit identity",
    );
    f.assert(
      await repo.pullRequests.isMerged(pr, { refresh: true }),
      "Refresh observes completed merge",
    );
    f.equal(
      await repo.content.readText("merge.txt"),
      "merge\n",
      "Merged content reaches target branch",
    );
  },
  "core/pull-request-comments": async (f: GitLabE2EFixtureDriver) => {
    const repo = await f.project();
    await f.commit(repo.id, "main", "before.txt", "one\ntwo\nthree\nfour\nfive\n");
    await repo.branches.create({ name: "feature", source: "main" });
    await f.commit(repo.id, "feature", "review.txt", "review\n");
    await repo.content.commitChanges({
      branch: "feature",
      message: "Rename and edit review file",
      changes: [{
        operation: "move",
        fromPath: "before.txt",
        path: "after.txt",
      }],
    }).execute();
    await f.commit(repo.id, "feature", "after.txt", "one\ntwo\nchanged\nfour\nfive\n", "update");
    const pr = await repo.pullRequests.create({
      title: "Review me",
      source: { owner: "root", repository: repo.name, branch: "feature" },
      targetBranch: "main",
    });
    await repo.pullRequests.comment(pr, { body: "General comment" });
    await f.eventually(
      () => f.raw("GET", `/projects/${repo.id}/merge_requests/${pr.number}`),
      (p) => !!p.diff_refs,
      "MR diff refs",
    );
    await repo.pullRequests.comment(pr, {
      body: "Inline comment",
      position: { path: "review.txt", side: "new", line: 1 },
    });
    await repo.pullRequests.comment(pr, {
      body: "Renamed file comment",
      position: { path: "after.txt", side: "new", line: 3 },
    });
    const notes = await f.raw("GET", `/projects/${repo.id}/merge_requests/${pr.number}/notes`);
    f.assert(
      JSON.stringify(notes).includes("General comment") &&
        JSON.stringify(notes).includes("Inline comment") &&
        JSON.stringify(notes).includes("Renamed file comment"),
      "General, inline, and renamed-file comments persisted",
    );
    await repo.pullRequests.requestReviewers(pr, ["root"]);
    const state = await f.raw("GET", `/projects/${repo.id}/merge_requests/${pr.number}`);
    f.assert(JSON.stringify(state.reviewers).includes('"root"'), "Reviewer assignment persisted");
  },
  "core/pull-request-approval": async (f: GitLabE2EFixtureDriver) => {
    const repo = await f.project();
    const user = await f.raw("POST", "/users", {
      username: `${f.prefix}-reviewer`,
      name: "PanGit Reviewer",
      email: `${f.prefix}@example.invalid`,
      password: crypto.randomUUID() + "zQ!7",
      skip_confirmation: true,
    });
    f.users.push(String(user.id));
    await f.raw("POST", `/projects/${repo.id}/members`, { user_id: user.id, access_level: 40 });
    const token = await f.raw("POST", `/users/${user.id}/personal_access_tokens`, {
      name: "review-fixture",
      scopes: ["api"],
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    });
    await repo.branches.create({ name: "review", source: "main" });
    await f.commit(repo.id, "review", "approve.txt", "approve");
    const pr = await repo.pullRequests.create({
      title: "Approve me",
      source: { owner: "root", repository: repo.name, branch: "review" },
      targetBranch: "main",
    });
    await f.eventually(
      () => f.raw("GET", `/projects/${repo.id}/merge_requests/${pr.number}`),
      (p) =>
        !!p.diff_refs &&
        !["checking", "approvals_syncing"].includes(String(p.detailed_merge_status)),
      "approval readiness",
    );
    const reviewer = await (await createClient("gitlab", f.version, f.apiUrl)).auth.token(
      String(token.token),
    );
    const reviewed = await (await reviewer.container("root")).repository(repo.name);
    await reviewed.pullRequests.approve(
      await reviewed.pullRequests.get(pr.number),
      "Reviewed via PanGit",
    );
    const approvals = await f.raw(
      "GET",
      `/projects/${repo.id}/merge_requests/${pr.number}/approvals`,
    );
    f.assert(
      JSON.stringify(approvals.approved_by).includes(`${f.prefix}-reviewer`),
      "Real separate reviewer approval persisted",
    );
    const reviews = reviewed.pullRequests.reviews(pr);
    f.equal(
      reviews.support.supported,
      false,
      "Persistent review objects are explicitly unsupported",
    );
  },
  "core/commit-statuses": async (f: GitLabE2EFixtureDriver) => {
    const repo = await f.project();
    const ref = { kind: "branch" as const, name: "main" };
    const pending = await repo.statuses.set(ref, { context: "pangit/check", state: "pending" })
      .execute();
    f.equal(pending.state, "pending", "Pending status round trip");
    await repo.statuses.set(ref, {
      context: "pangit/check",
      state: "success",
      description: "passed",
    }).execute();
    f.equal((await repo.statuses.get(ref)).state, "success", "Combined latest status");
    f.assert(
      (await repo.statuses.list(ref)).items.some((s) => s.context === "pangit/check"),
      "Status listing",
    );
  },
  "shared-capability/issues": async (f: GitLabE2EFixtureDriver) => {
    const repo = await f.project();
    const issue = await repo.issues.create({ title: "Issue", description: "Initial" });
    const directIssue = await f.prove("Issue lookup is direct", [
      "getApiV4ProjectsIdIssuesIssueIid",
    ], () => repo.issues.get(issue.number));
    f.equal(directIssue.id, issue.id, "Issue direct identity");
    const updated = await repo.issues.update(issue, { title: "Updated", description: "Body" })
      .execute();
    f.equal(updated.title, "Updated", "Issue update");
    const comment = await repo.issues.comments.create(issue, { body: "Comment" });
    f.equal(
      (await repo.issues.comments.get(comment.id)).body,
      "Comment",
      "Direct note ID retains issue identity",
    );
    const edited = await repo.issues.comments.update(comment, { body: "Edited" });
    f.equal(edited.body, "Edited", "Note update");
    f.assert(
      (await repo.issues.comments.list(issue)).items.some((c) => c.id === comment.id),
      "Notes list",
    );
    await repo.issues.comments.delete(edited);
    f.equal((await repo.issues.setState(updated, "closed")).state, "closed", "Issue close");
    f.equal((await repo.issues.list({ state: "closed" })).items.length, 1, "Issue state filter");
  },
  "shared-capability/releases": async (f: GitLabE2EFixtureDriver) => {
    const repo = await f.project();
    const release = await repo.releases.create({
      tagName: "v1.0.0",
      name: "Release",
      description: "Notes",
      target: "main",
    });
    f.equal(
      (await f.prove(
        "Release tag lookup is direct",
        ["getApiV4ProjectsIdReleasesTagName"],
        () => repo.releases.getByTag(release.tagName),
      )).id,
      release.id,
      "Release tag identity",
    );
    const asset = await repo.releases.assets.upload(release, {
      name: "asset.txt",
      data: new TextEncoder().encode("asset body"),
    });
    f.assert(asset.downloadUrl, "Release asset has download URL");
    const browser = new GitLabOAuthFixture(f.apiUrl, "root", f.password);
    await browser.login();
    const response = await browser.download(asset.downloadUrl!);
    f.equal(await response.text(), "asset body", "Uploaded release asset is downloadable");
    f.equal(
      (await repo.releases.assets.list(release, { maxItems: 10 })).length,
      1,
      "Release assets bounded listing",
    );
    const renamed = await repo.releases.assets.update(release, asset, { name: "renamed.txt" });
    f.equal(
      (await repo.releases.assets.get(release, renamed.id)).name,
      "renamed.txt",
      "Asset rename",
    );
    await repo.releases.assets.delete(release, renamed);
    const updated = await repo.releases.update(release, { description: "Updated notes" });
    f.equal(updated.description, "Updated notes", "Release update");
    await repo.releases.delete(updated);
    f.equal((await repo.releases.list()).items.length, 0, "Release deletion");
  },
  "shared-capability/packages": async (f: GitLabE2EFixtureDriver) => {
    const repo = await f.project();
    const response = await fetch(
      `${f.apiUrl}/api/v4/projects/${repo.id}/packages/generic/pangit-fixture/1.0.0/hello.txt`,
      { method: "PUT", headers: { "PRIVATE-TOKEN": f.token }, body: "package bytes" },
    );
    f.equal(response.status, 201, "Real generic package upload fixture");
    await response.body?.cancel();
    const client = await f.client();
    const identity = {
      owner: repo.fullName,
      type: "generic",
      name: "pangit-fixture",
      version: "1.0.0",
    };
    const pkg = await client.packages.get(identity);
    f.equal(pkg.version, "1.0.0", "Exact package version lookup");
    const files = await client.packages.files(identity, { maxFiles: 10 });
    f.equal(files[0].name, "hello.txt", "Package file metadata");
    f.equal(
      (await f.prove(
        "Package versions fetch one page",
        ["getApiV4ProjectsIdPackages"],
        () => client.packages.versions(identity),
      )).items.length,
      1,
      "Package versions one-page listing",
    );
    await client.packages.deleteVersion(identity);
    await f.eventually(
      () => client.packages.find(identity),
      (p) => p === undefined,
      "package deletion",
    );
    f.assert(true, "Package version deleted");
  },
  "shared-capability/branch-rules": async (f: GitLabE2EFixtureDriver) => {
    const repo = await f.project();
    // GitLab initializes default-branch protection asynchronously. Use a dedicated branch
    // so that the test does not race the provider's unrelated project initialization.
    await repo.branches.create({ name: "rule-target", source: "main" });
    const rule = await repo.branchRules.create({
      name: "rule-target",
      pushAllowed: false,
      forcePushAllowed: false,
    });
    f.equal(rule.pushAllowed, false, "Configured rule disallows direct pushes");
    f.equal(
      (await f.prove("Configured rule lookup is direct", [
        "getApiV4ProjectsIdProtectedBranchesName",
      ], () => repo.branchRules.get("rule-target"))).pushAllowed,
      false,
      "Configured rule persisted with denied direct pushes",
    );
    f.equal(
      (await repo.branchRules.list({ maxRules: 10 })).filter((r) => r.name === "rule-target")
        .length,
      1,
      "Configured rule listing includes the exact rule once",
    );
    const updated = await repo.branchRules.update(rule, { forcePushAllowed: true });
    f.equal(updated.forcePushAllowed, true, "Protection update");
    await repo.branchRules.delete(updated);
    await f.rejects(() => repo.branchRules.get("rule-target"), "NotFoundError");
    f.equal(
      (await repo.branchRules.list({ maxRules: 10 })).filter((r) => r.name === "rule-target")
        .length,
      0,
      "Deleted configured rule is absent from the authoritative rule listing",
    );
  },
  "shared-capability/branch-protection-enforcement": async (f: GitLabE2EFixtureDriver) => {
    const repo = await f.project();
    f.equal(
      repo.branchRules.support.effectiveProtection.supported,
      false,
      "GL-001 is reported as unavailable",
    );
    await f.prove("GL-001 rejects before requesting unreliable provider state", [], async () => {
      try {
        await repo.branchRules.effective("main");
      } catch (error) {
        f.assert(error instanceof Error, "Provider defect produces a typed error");
        f.equal((error as Error).name, "CapabilityUnavailableError", "Provider defect error type");
        f.assert(
          (error as Error).message.includes("GL-001"),
          "Provider defect identifies its upstream follow-up",
        );
        return;
      }
      throw new Error("GL-001 must not expose an unreliable permission result");
    });
  },
  "shared-capability/webhooks": async (f: GitLabE2EFixtureDriver) => {
    const repo = await f.project();
    const hook = await repo.webhooks.create({
      url: `http://webhook-journal:8080/hooks/${f.prefix}`,
      events: ["issue"],
      active: true,
      contentType: "json",
    });
    f.equal(
      (await f.prove(
        "Webhook lookup is direct",
        ["getApiV4ProjectsIdHooksHookId"],
        () => repo.webhooks.get(hook.id),
      )).events,
      ["issue"],
      "Webhook event mapping",
    );
    await repo.issues.create({ title: "Hook delivery" });
    await f.eventually(
      async () => {
        const r = await fetch(
          `http://webhook-journal:8080/events?key=${f.prefix}&event=Issue%20Hook`,
        );
        return await r.json() as { events: unknown[] };
      },
      (p) => p.events.length > 0,
      "actual webhook delivery",
    );
    f.assert(true, "Actual GitLab webhook received by isolated journal");
    const updated = await repo.webhooks.update(hook, { events: ["push", "issue"] });
    f.assert(updated.events.includes("push"), "Webhook update");
    await repo.webhooks.delete(updated);
    f.equal((await repo.webhooks.list()).items.length, 0, "Webhook deleted");
  },
  "shared-capability/ci-run-discovery": async (f: GitLabE2EFixtureDriver) => {
    const repo = await f.project();
    const sha = await f.commit(
      repo.id,
      "main",
      ".gitlab-ci.yml",
      "fixture:\n  tags: [pangit-e2e]\n  script:\n    - echo artifact-body > result.txt\n  artifacts:\n    paths: [result.txt]\n",
    );
    const raw = await f.raw("POST", `/projects/${repo.id}/pipeline`, { ref: "main" });
    const run = await f.eventually(
      () => repo.ciRuns.run(String(raw.id)),
      (r) => r.status === "completed",
      "real CI shell job",
      180,
    );
    f.equal(run.conclusion, "success", "Real runner executes pipeline successfully");
    f.equal(run.sha, sha, "Pipeline head SHA");
    f.equal(
      (await repo.ciRuns.workflow(".gitlab-ci.yml")).path,
      ".gitlab-ci.yml",
      "CI configuration workflow",
    );
    const jobs = await repo.ciRuns.jobs(run.id);
    f.equal(jobs.items[0].conclusion, "success", "CI job conclusion");
    f.equal(
      (await f.prove(
        "CI job lookup is direct",
        ["getApiV4ProjectsIdJobsJobId"],
        () => repo.ciRuns.job(jobs.items[0].id),
      )).name,
      "fixture",
      "Direct job lookup",
    );
    const artifact = await repo.ciRuns.findArtifact(run.id, "artifacts.zip");
    f.assert(artifact && artifact.size! > 0, "Actual job artifact discovered");
    f.equal(
      (await repo.ciRuns.artifact(artifact!.id)).id,
      artifact!.id,
      "Stable job archive identity",
    );
    f.assert(
      (await repo.ciRuns.runs({ branch: "main", headSha: sha })).items.some((r) => r.id === run.id),
      "Pipeline filtered discovery",
    );
  },
  "shared-capability/blob-reads": async (f: GitLabE2EFixtureDriver) => {
    const repo = await f.project();
    await f.commit(repo.id, "main", "blob.txt", "blob\n");
    const content = await repo.content.read("blob.txt", { includeBytes: false });
    const blob = await repo.blobs.get(content.sha!);
    f.equal([...blob.bytes], [...new TextEncoder().encode("blob\n")], "Git object blob bytes");
    f.equal(blob.sha, content.sha, "Blob SHA independently verified");
    await f.prove("Native entity access has zero requests", [], async () => {
      await content.native.gitlab(({ content }) =>
        f.assert(!!content, "Original content payload preserved")
      );
      await blob.native.gitlab(({ blob }) => f.assert(!!blob, "Original blob payload preserved"));
    });
  },
  "shared-capability/unsupported-modules": async (f: GitLabE2EFixtureDriver) => {
    const repo = await f.project();
    await f.prove(
      "Unsupported draft release fails before requests",
      [],
      () =>
        f.rejects(
          () => repo.releases.create({ tagName: "draft", draft: true }),
          "CapabilityUnavailableError",
        ),
    );
    await f.prove(
      "Unsupported rule fields fail before requests",
      [],
      () =>
        f.rejects(
          () => repo.branchRules.create({ name: "main", requiredApprovals: 1 }),
          "CapabilityUnavailableError",
        ),
    );
    const client = await f.client();
    f.assert(!("gitea" in client.native), "Only selected native provider is exposed");
  },
} satisfies Record<string, (f: GitLabE2EFixtureDriver) => Promise<void>>;

export const gitlabContractCatalog = Object.freeze(
  Object.entries(contracts).map(([id, run]) => Object.freeze({ id, run })),
);
export function selectGitLabContracts(id?: string) {
  if (id === undefined) return gitlabContractCatalog;
  const contract = gitlabContractCatalog.find((c) => c.id === id);
  if (!contract) throw new TypeError(`Unknown GitLab fluent contract: ${id}`);
  return [contract];
}
