import { createRequestHandler, type ServerBuild } from "react-router";

const clientRoot = new URL("./build/client/", import.meta.url);
const serverBuild = new URL("./build/server/index.js", import.meta.url);
const build = await import(serverBuild.href) as ServerBuild;
const handleRequest = createRequestHandler(build, "production");
const contentTypes: Record<string, string> = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  png: "image/png",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  webp: "image/webp",
  woff2: "font/woff2",
  ts: "text/plain; charset=utf-8",
  md: "text/plain; charset=utf-8",
};

export async function serve(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "GET" || request.method === "HEAD") {
    let pathname: string;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return new Response("Invalid URL", { status: 400 });
    }
    const file = new URL(`.${pathname}`, clientRoot);
    if (!file.href.startsWith(clientRoot.href)) return new Response("Not found", { status: 404 });
    try {
      const stat = await Deno.stat(file);
      if (stat.isFile) {
        const extension = file.pathname.split(".").at(-1) ?? "";
        const headers = new Headers({
          "Content-Type": contentTypes[extension] ?? "application/octet-stream",
          "Content-Length": String(stat.size),
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": pathname.startsWith("/assets/")
            ? "public, max-age=31536000, immutable"
            : "public, max-age=0, must-revalidate",
        });
        return new Response(request.method === "HEAD" ? null : (await Deno.open(file)).readable, {
          headers,
        });
      }
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
  }
  return handleRequest(request);
}

if (import.meta.main) {
  const port = Number(Deno.env.get("PORT") ?? "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  Deno.serve({ port, hostname: "0.0.0.0" }, serve);
}
