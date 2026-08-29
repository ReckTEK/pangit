Deno.test("public root exposes only the managed client and lazy raw-client selector", async () => {
  const root = await import("@mannsion/pangit");
  const names = ["PanGit", "loadRestClient"] as const;

  if (Object.keys(root).sort().join(",") !== names.join(",")) {
    throw new Error(`Unexpected PanGit runtime exports: ${Object.keys(root).sort().join(", ")}`);
  }

  const managed = root.PanGit.createClient("gitea", "1.27.2", {
    baseUrl: "https://example.test/api/v1",
  });
  if (managed.provider !== "gitea" || managed.version !== "1.27.2") {
    throw new Error("The managed PanGit entry point did not preserve provider selection");
  }

  const raw = await root.loadRestClient("gitea", "1.27.2", {
    baseUrl: "https://example.test/api/v1",
  });
  if (raw.constructor.name !== "GiteaRestClient") {
    throw new Error("The lazy raw-client selector did not load the selected client");
  }
});
