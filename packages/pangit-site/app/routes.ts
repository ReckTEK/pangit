import { index, route, type RouteConfig } from "@react-router/dev/routes";
import { siteUrls } from "./urls.ts";
import { guides } from "./guides/catalog.ts";

export default [
  route(siteUrls.home, "routes/home.tsx"),
  route(siteUrls.theme, "routes/theme.ts"),
  route(siteUrls.docs, "routes/docs-layout.tsx", [
    index("routes/docs-index.tsx"),
    ...guides.map((guide) =>
      route(siteUrls.patterns.guide(guide.slug), `guides/pages/${guide.slug}.tsx`)
    ),
    route(siteUrls.patterns.reference, "routes/raw-reference.tsx"),
    route(siteUrls.patterns.methods, "routes/client-methods.tsx"),
  ]),
] satisfies RouteConfig;
