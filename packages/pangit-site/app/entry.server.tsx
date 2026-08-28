import { renderToReadableStream } from "react-dom/server.browser";
import { type EntryContext, ServerRouter } from "react-router";

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
): Promise<Response> {
  const stream = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
    {
      signal: request.signal,
      onError(error) {
        responseStatusCode = 500;
        console.error(error);
      },
    },
  );
  // Deno serves complete HTML for readers and crawlers; interactive data hydrates afterward.
  await stream.allReady;
  responseHeaders.set("Content-Type", "text/html; charset=utf-8");
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  responseHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return new Response(stream, { status: responseStatusCode, headers: responseHeaders });
}
