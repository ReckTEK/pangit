import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { CodeBlock } from "../components/code-block.tsx";
import { createSiteUrls } from "../urls.ts";
import { siteConfig } from "../../site.config.ts";
import { guides, searchGuides } from "./catalog.ts";
import { GuidePage } from "./guide-page.tsx";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

Deno.test("every guide has a unique configured route and an authored page", async () => {
  const urls = createSiteUrls({
    ...siteConfig,
    routes: { ...siteConfig.routes, docs: "/manual", fluent: "workflows" },
  });
  for (
    const [query, slug] of [[" GITLAB ", "providers"], ["readText", "files"], [
      "OAuth cookie",
      "authentication",
    ]]
  ) {
    assert(
      searchGuides(query).some((guide) => guide.slug === slug),
      `Guide search missed: ${query}`,
    );
  }
  assert(searchGuides("no-such-guide").length === 0, "Unknown guide search returned results");
  const paths = new Set<string>();
  for (const guide of guides) {
    const path = urls.guide(guide.slug);
    assert(path === `/manual/workflows/${guide.slug}`, "Guide URL ignored configuration");
    assert(!paths.has(path), `Duplicate guide route: ${path}`);
    paths.add(path);
    const source = await Deno.readTextFile(new URL(`./pages/${guide.slug}.tsx`, import.meta.url));
    assert(source.includes(`guideMeta("${guide.slug}")`), `Missing metadata: ${guide.slug}`);
    assert(source.includes(`slug="${guide.slug}"`), `Wrong page identity: ${guide.slug}`);
    for (const match of source.matchAll(/file="([^"]+)"/g)) {
      const snippet = await Deno.readTextFile(new URL(`../snippets/${match[1]}`, import.meta.url));
      assert(snippet.trim().length > 0, `Empty snippet: ${match[1]}`);
    }
    for (const match of source.matchAll(/to="([^"]+)"/g)) {
      assert(guides.some((entry) => entry.slug === match[1]), `Unknown guide link: ${match[1]}`);
    }
  }
});

Deno.test("method references cover every callable capability and point to existing contracts", async () => {
  const sources = new Set<string>();
  for await (const file of Deno.readDir(new URL("./methods/", import.meta.url))) {
    if (!file.name.endsWith(".ts")) continue;
    const references = await import(new URL(`./methods/${file.name}`, import.meta.url).href);
    for (const reference of Object.values(references)) {
      const { source, methods } = reference as {
        source: string;
        methods: Record<string, string>;
      };
      assert(
        Object.values(methods).every((value) => value.length > 20),
        "Empty method description",
      );
      await Deno.stat(new URL(`../../../pangit/src/${source}`, import.meta.url));
      sources.add(source);
    }
  }
  for (const directory of ["capabilities", "capabilities/optional"]) {
    for await (
      const file of Deno.readDir(
        new URL(`../../../pangit/src/fluent-api/${directory}`, import.meta.url),
      )
    ) {
      // This handle exposes support metadata only, covered by the provider-support guide.
      if (file.name === "mod.ts" || file.name === "UnsupportedOptionalCapabilities.ts") continue;
      if (file.isFile && file.name.endsWith(".ts")) {
        assert(
          sources.has(`fluent-api/${directory}/${file.name}`),
          `Undocumented capability: ${file.name}`,
        );
      }
    }
  }
});

Deno.test("guide sections provide matching navigation anchors and ordered next steps", () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <GuidePage
        slug="files"
        sections={[
          { id: "read", title: "Read a file", content: <p>A file body.</p> },
          { id: "write", title: "Write a file", content: <p>A file change.</p> },
        ]}
      />
    </MemoryRouter>,
  );
  assert((markup.match(/<h1\b/g) ?? []).length === 1, "Guide must have one primary heading");
  for (const id of ["read", "write"]) {
    assert(markup.includes(`id="${id}"`), `Missing section: ${id}`);
    assert(markup.includes(`href="#${id}"`), `Missing navigation target: ${id}`);
    assert(markup.includes(`aria-labelledby="${id}"`), `Unlabeled section: ${id}`);
  }
  assert(markup.includes("/docs/fluent/commits"), "Previous guide changed");
  assert(markup.includes("/docs/fluent/pull-requests"), "Next guide changed");
});

Deno.test("code remains readable, escaped, and keyboard reachable before hydration", () => {
  const markup = renderToStaticMarkup(
    <CodeBlock source='const html = "<script>";' label="Example" />,
  );
  assert(markup.includes("&lt;script&gt;"), "Code became executable markup");
  assert(markup.includes('tabindex="0"'), "Scrollable code is not keyboard reachable");
  assert(markup.includes('aria-label="Copy Example code"'), "Copy control has no accessible label");
});
