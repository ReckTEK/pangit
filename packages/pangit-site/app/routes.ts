import { index, route, type RouteConfig } from "@react-router/dev/routes";
import { siteUrls } from "./urls.ts";

export default [
  route(siteUrls.home, "routes/home.tsx"),
  route(siteUrls.theme, "routes/theme.ts"),
  route(siteUrls.docs, "routes/docs-layout.tsx", [
    index("routes/docs-index.tsx"),
    route(siteUrls.patterns.reference, "routes/raw-reference.tsx"),
    route(siteUrls.patterns.methods, "routes/client-methods.tsx"),
    route(siteUrls.patterns.guides, "routes/guide.tsx"),
    route(siteUrls.patterns.unified, "routes/unified.tsx"),
  ]),
] satisfies RouteConfig;
