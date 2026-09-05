import type { ReactNode } from "react";
import {
  isRouteErrorResponse,
  Link,
  Links,
  type LoaderFunctionArgs,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useFetcher,
  useLoaderData,
  useLocation,
  useRouteError,
  useRouteLoaderData,
} from "react-router";
import { ArrowUpRight } from "lucide-react";
import { siteConfig } from "../site.config.ts";
import { readTheme, type ThemePreference } from "./lib.ts";
import { isWithinPath, siteUrls } from "./urls.ts";
// @ts-types="./types/vite-url.d.ts"
import stylesheet from "./styles.css?url";

export const links = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "icon", type: "image/png", href: siteUrls.logo },
];

export function loader({ request }: LoaderFunctionArgs) {
  return { theme: readTheme(request.headers.get("cookie")) };
}

export function Layout({ children }: { children: ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");
  const theme = data?.theme ?? "system";
  return (
    <html lang="en" className={theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content={theme === "system" ? "light dark" : theme} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function ThemeSelect({ theme }: { theme: ThemePreference }) {
  const fetcher = useFetcher();
  const location = useLocation();
  return (
    <fetcher.Form method="post" action={siteUrls.theme} preventScrollReset>
      <input
        type="hidden"
        name="returnTo"
        value={location.pathname + location.search + location.hash}
      />
      <select
        aria-label="Color theme"
        name="theme"
        value={theme}
        onChange={(event) => fetcher.submit(event.currentTarget.form, { preventScrollReset: true })}
        className="min-h-9 cursor-pointer rounded-lg border border-line bg-paper px-2 text-xs text-ink sm:text-sm"
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
      <noscript>
        <button type="submit" className="ml-2 text-link">Apply</button>
      </noscript>
    </fetcher.Form>
  );
}

export default function App() {
  const { theme } = useLoaderData<typeof loader>();
  const location = useLocation();
  const inDocs = isWithinPath(location.pathname, siteUrls.docs);
  return (
    <>
      <a className="skip-link" href={siteUrls.main}>Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-md">
        <div className="mx-auto flex h-18 max-w-[1600px] items-center justify-between gap-2 px-4 sm:gap-5 sm:px-9">
          <Link
            to={siteUrls.home}
            aria-label={`${siteConfig.name} home`}
            className="flex shrink-0 items-center gap-2.5"
          >
            <img
              src={siteUrls.logo}
              alt=""
              className="h-9 w-9 object-contain dark:rounded-lg dark:bg-[#fcfbf8] dark:p-1"
            />
            <span className="text-[23px] font-bold tracking-[-1px]">
              {siteConfig.wordmark.prefix}
              <span className="text-accent">{siteConfig.wordmark.accent}</span>
            </span>
          </Link>
          <nav
            aria-label="Main navigation"
            className="flex items-center gap-3 text-xs font-medium sm:gap-8 sm:text-sm"
          >
            <Link
              to={siteUrls.docs}
              aria-label="Documentation"
              className={inDocs ? "text-accent" : "nav-link"}
            >
              <span className="sm:hidden">Docs</span>
              <span className="hidden sm:inline">Documentation</span>
            </Link>
            <a
              href={siteUrls.repository}
              className="nav-link hidden items-center gap-1 sm:flex"
            >
              Source code <ArrowUpRight size={14} />
            </a>
            <span className="hidden h-5 w-px bg-line sm:block" />
            <ThemeSelect theme={theme} />
          </nav>
        </div>
      </header>
      <Outlet />
      <footer className="border-t border-line px-6 py-7 text-xs text-muted">
        <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-3">
          <span>{siteConfig.name} · {siteConfig.organization}</span>
          <span className="font-mono">Deno 2 · TypeScript · OpenAPI</span>
        </div>
      </footer>
    </>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const missing = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main id={siteConfig.anchors.main} className="mx-auto max-w-3xl px-6 py-32">
      <p className="eyebrow">{missing ? "404 / NOT FOUND" : "SOMETHING WENT WRONG"}</p>
      <h1 className="mt-5 text-4xl font-semibold tracking-tight">
        {missing ? "That page isn’t here." : "This page couldn’t load."}
      </h1>
      <p className="mt-4 text-muted">
        Browse the guides or choose a provider from the documentation overview.
      </p>
      <Link to={siteUrls.docs} className="button-primary mt-8">Open documentation</Link>
    </main>
  );
}
