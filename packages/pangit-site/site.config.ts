const wordmark = { prefix: "Pan", accent: "Git" };
const packageName = "@mannsion/pangit";

/** Site-owned settings. Provider/version inventories remain in the generated package catalog. */
export const siteConfig = {
  name: `${wordmark.prefix}${wordmark.accent}`,
  wordmark,
  packageName,
  links: {
    package: `https://jsr.io/${packageName}`,
  },
  routes: {
    home: "/",
    docs: "/docs",
    theme: "/theme",
    raw: "raw",
    methods: "methods",
    unified: "unified",
  },
  assets: {
    openapi: "/openapi",
    brand: {
      source: "docs/images/",
      path: "/brand",
      files: ["pangit-logo.png"],
    },
    logo: "pangit-logo.png",
  },
  anchors: { main: "main", reference: "rest-api-reference" },
  snippets: { install: "install.sh" },
  theme: { cookie: "pangit-theme", maxAge: 31_536_000 },
};

export type SiteConfig = typeof siteConfig;
