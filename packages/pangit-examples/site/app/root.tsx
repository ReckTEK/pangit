import type { ReactNode } from "react";
import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from "react-router";
// @ts-types="./vite.d.ts"
import stylesheet from "./styles.css?url";

export const links = () => [{ rel: "stylesheet", href: stylesheet }];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            PanGit Gitea login
          </Link>
          <span className="text-sm text-slate-500">Gitea · PanGit · Deno</span>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
    ? error.message
    : "Unknown error";
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <p className="text-sm font-semibold text-red-700">
        The example could not continue.
      </p>
      <h1 className="mt-3 text-3xl font-semibold">{message}</h1>
      <Link to="/" className="button mt-8">Back to login</Link>
    </main>
  );
}
