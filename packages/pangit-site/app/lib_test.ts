import { matchRoutes, RouterContextProvider } from "react-router";
import { siteConfig } from "../site.config.ts";
import { documentation, findReference, readTheme } from "./lib.ts";
import { action as setTheme } from "./routes/theme.ts";
import { createSiteUrls, isWithinPath, siteUrls } from "./urls.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

Deno.test("reference routes accept the catalog and reject unknown providers and versions", () => {
  for (const provider of documentation.providers) {
    for (const version of provider.versions) {
      assert(
        findReference(provider.id, version.version).version.route === version.route,
        "Catalog route differs",
      );
    }
  }
  for (
    const [provider, version] of [["unknown", "latest"], ["gitea", "0.0"], ["__proto__", "latest"]]
  ) {
    try {
      findReference(provider, version);
      throw new Error("Unknown reference accepted");
    } catch (error) {
      assert(
        error instanceof Response && error.status === 404,
        "Unknown reference did not return 404",
      );
    }
  }
});

Deno.test("configured URL changes keep routes, navigation, and downloads aligned", () => {
  const urls = createSiteUrls({
    ...siteConfig,
    links: { package: "https://packages.example/pangit" },
    routes: {
      home: "/start",
      docs: "/manual",
      theme: "/appearance",
      raw: "rest",
      methods: "functions",
      unified: "common",
    },
    assets: {
      ...siteConfig.assets,
      openapi: "/contracts",
      brand: { ...siteConfig.assets.brand, path: "/identity" },
    },
  });
  const routes = [
    { id: "home", path: urls.home },
    { id: "theme", path: urls.theme },
    {
      id: "docs",
      path: urls.docs,
      children: Object.entries(urls.patterns).map(([id, path]) => ({ id, path })),
    },
  ];
  for (const provider of documentation.providers) {
    for (const version of provider.versions) {
      for (const view of ["explorer", "methods"] as const) {
        const href = urls.reference(provider.id, version.version, view);
        const match = matchRoutes(routes, href)?.at(-1);
        assert(
          match?.route.id === (view === "explorer" ? "reference" : "methods"),
          "Wrong reference view",
        );
        assert(
          match.params.provider === provider.id && match.params.version === version.version,
          "Reference parameters changed",
        );
        assert(
          urls.referenceView(href) === view,
          "Version switching would lose the reference view",
        );
      }
    }
  }
  assert(
    matchRoutes(routes, urls.unified)?.at(-1)?.route.id === "unified",
    "Unified link is detached from its route",
  );
  assert(
    urls.spec("gitea", "1.27.2") === "/contracts/gitea/1.27.2.json",
    "Spec path ignored configuration",
  );
  assert(
    urls.operations("gitea", "1.27.2") === "/contracts/gitea/1.27.2.operations.json",
    "Method index path ignored configuration",
  );
  assert(urls.logo === `/identity/${siteConfig.assets.logo}`, "Brand path ignored configuration");
  assert(urls.package === "https://packages.example/pangit", "Package link ignored configuration");
  assert(
    isWithinPath("/manual/rest/gitea/1.27.2?variant=test#tag/test", urls.docs),
    "Docs path not recognized",
  );
  assert(!isWithinPath("/manual-other", urls.docs), "Unrelated path treated as documentation");
  assert(isWithinPath("/manual", "/"), "Root path is not supported");
  assert(!isWithinPath("//other.example/manual", "/"), "External link treated as a site path");
});

Deno.test("theme selection is server-readable, validates input, and cannot redirect off-site", async () => {
  const cookieName = siteConfig.theme.cookie;
  assert(readTheme(`other=x; ${cookieName}=dark; another=y`) === "dark", "Theme not read");
  assert(readTheme(`${cookieName}=light`) === "light", "Explicit light preference ignored");
  for (
    const cookie of [
      null,
      "",
      `not-${cookieName}=dark`,
      `${cookieName}=invalid`,
      `${cookieName}=system`,
    ]
  ) {
    assert(readTheme(cookie) === "system", "Missing or invalid preference must follow the OS");
  }
  const request = (theme: string, returnTo: string) =>
    new Request(new URL(siteUrls.theme, "https://pangit.example"), {
      method: "POST",
      body: new URLSearchParams({ theme, returnTo }),
    });
  const args = {
    params: {},
    context: new RouterContextProvider(),
    url: new URL(siteUrls.theme, "https://pangit.example"),
    pattern: siteUrls.theme,
  };
  const result = await setTheme({ request: request("dark", "/docs"), ...args });
  assert(result.headers.get("Location") === "/docs", "Theme did not return to the current page");
  assert(
    result.headers.get("Set-Cookie")?.includes(`${cookieName}=dark; Path=/`),
    "Theme cookie missing",
  );
  assert(result.headers.get("Set-Cookie")?.includes("Secure"), "HTTPS cookie missing Secure");
  const system = await setTheme({ request: request("system", "/docs#schemas"), ...args });
  assert(
    system.headers.get("Location") === "/docs#schemas",
    "Theme reset lost the current section",
  );
  assert(
    system.headers.get("Set-Cookie")?.startsWith(`${cookieName}=; Path=/; Max-Age=0;`),
    "System preference must clear the manual override",
  );
  for (const returnTo of ["https://other.example", "//other.example", "/\\other.example"]) {
    const result = await setTheme({ request: request("light", returnTo), ...args });
    assert(
      result.headers.get("Location") === siteUrls.home,
      "Theme action permits external redirect",
    );
  }
  const invalid = await setTheme({ request: request("invalid", "/docs"), ...args });
  assert(invalid.status === 400, "Invalid theme accepted");
});
