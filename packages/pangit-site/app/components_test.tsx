import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { ProviderVersionLinks } from "./components/provider-version-links.tsx";
import { ReferenceHeading } from "./components/reference-heading.tsx";
import { documentation } from "./lib.ts";
import DocsIndex from "./routes/docs-index.tsx";
import { siteUrls } from "./urls.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function linksWithClass(markup: string, className: string) {
  return [...markup.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].filter(([, attributes]) =>
    attributes.match(/\bclass="([^"]*)"/)?.[1].split(" ").includes(className)
  );
}

Deno.test("provider table links retain manifest order and descriptive accessible names", () => {
  for (const provider of documentation.providers) {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={[siteUrls.home]}>
        <ProviderVersionLinks provider={provider} variant="table" />
      </MemoryRouter>,
    );
    const links = linksWithClass(markup, "version-link");
    assert(links.length === provider.versions.length, "Table omitted or duplicated a version");
    assert(markup.startsWith('<div class="flex flex-wrap gap-2">'), "Table link layout changed");
    for (const [index, version] of provider.versions.entries()) {
      const [, attributes, content] = links[index];
      assert(
        attributes.includes(`href="${siteUrls.reference(provider.id, version.version)}"`),
        "Table link or version order changed",
      );
      assert(
        attributes.includes(`aria-label="${provider.name} ${version.version} API reference"`),
        "Table reference accessible name changed",
      );
      assert(attributes.includes('class="version-link"'), "Table versions must use plain styling");
      assert(content === version.version, "Table versions must retain plain text labels");
    }
  }
});

Deno.test("provider catalog cards retain version order, current styling, and reference links", () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter initialEntries={[siteUrls.docs]}>
      <DocsIndex />
    </MemoryRouter>,
  );
  const links = linksWithClass(markup, "version-link");
  const versions = documentation.providers.flatMap((provider) =>
    provider.versions.toReversed().map((version) => ({ provider, version }))
  );
  assert(links.length === versions.length, "Catalog omitted or duplicated a version");
  for (const [index, { provider, version }] of versions.entries()) {
    const [, attributes, content] = links[index];
    assert(
      attributes.includes(`href="${siteUrls.reference(provider.id, version.version)}"`),
      "Catalog link or version order changed",
    );
    assert(
      attributes.includes('class="version-link current"') ===
        (version.version === provider.selected),
      "Current version styling changed",
    );
    assert(content.startsWith(version.version), "Version label changed");
    assert(content.includes("lucide-arrow-right"), "Catalog version arrow missing");
  }
});

Deno.test("reference selectors retain native labels, selected values, and version ordering", () => {
  const provider = documentation.providers.find((entry) => entry.versions.length > 1)!;
  const version = provider.versions.find((entry) => entry.version === provider.selected)!;
  const markup = renderToStaticMarkup(
    <MemoryRouter initialEntries={[siteUrls.reference(provider.id, version.version, "methods")]}>
      <ReferenceHeading provider={provider} version={version} />
    </MemoryRouter>,
  );
  const selects = [...markup.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/g)];
  assert(selects.length === 2, "Reference selector count changed");
  for (const [index, label] of ["Provider", "API version"].entries()) {
    assert(
      selects[index][1].includes(`<span class="sr-only">${label}</span>`),
      "Native select label missing",
    );
    assert(selects[index][1].includes(`aria-label="${label}"`), "Select accessible name changed");
    assert(selects[index][1].includes('aria-hidden="true"'), "Decorative select icon is exposed");
  }
  const providerOptions = [...selects[0][1].matchAll(/<option\b([^>]*)>(.*?)<\/option>/g)];
  assert(providerOptions.length === documentation.providers.length, "Provider options changed");
  for (const [index, entry] of documentation.providers.entries()) {
    const [, attributes, label] = providerOptions[index];
    assert(attributes.includes(`value="${entry.id}"`), "Provider order or value changed");
    assert(label === entry.name, "Provider option label changed");
    assert(
      attributes.includes("selected=") === (entry.id === provider.id),
      "Wrong provider selected",
    );
  }
  const versionOptions = [...selects[1][1].matchAll(/<option\b([^>]*)>(.*?)<\/option>/g)];
  assert(versionOptions.length === provider.versions.length, "Version options changed");
  for (const [index, entry] of provider.versions.toReversed().entries()) {
    const [, attributes, label] = versionOptions[index];
    assert(attributes.includes(`value="${entry.version}"`), "Version order or value changed");
    assert(
      label === `${entry.version}${entry.version === provider.selected ? " · current" : ""}`,
      "Version option label changed",
    );
    assert(
      attributes.includes("selected=") === (entry.version === version.version),
      "Wrong API version selected",
    );
  }
});

Deno.test("reference heading preserves compact title, download, and active view navigation", () => {
  const provider = documentation.providers[0];
  const version = provider.versions[0];
  for (const view of ["explorer", "methods"] as const) {
    const compact = view === "explorer";
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={[siteUrls.reference(provider.id, version.version, view)]}>
        <ReferenceHeading provider={provider} version={version} compact={compact} />
      </MemoryRouter>,
    );
    assert(
      markup.includes(
        `<h1 class="sr-only">${provider.name} ${version.version} API reference</h1>`,
      ) ===
        compact,
      "Compact reference title changed",
    );
    assert(
      markup.includes(`href="${siteUrls.spec(provider.id, version.version)}" download=""`),
      "Specification download changed",
    );
    const links = linksWithClass(markup, "reference-tab");
    const active = links.filter(([, attributes]) => attributes.includes('aria-current="page"'));
    assert(active.length === 1, "Reference should have one active view");
    assert(
      active[0][1].includes(`href="${siteUrls.reference(provider.id, version.version, view)}"`),
      "Wrong reference view is active",
    );
  }
});
