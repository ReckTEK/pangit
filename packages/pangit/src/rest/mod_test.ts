import {
  deepFreezeRestOperations,
  isRestDocumentedSuccess,
  RestApiError,
  type RestBinary,
  RestClient,
  type RestGeneratedRequestOptions,
  type RestInt64,
  type RestJsonData,
  type RestJsonNumber,
  type RestJsonValue,
  type RestMethod,
  type RestOperation,
  RestParseError,
  type RestRequestContext,
  type RestRequestOperation,
  type RestRequestOptions,
  type RestRequestValue,
  type RestResponse,
  RestTransportError,
  type RestUndocumentedResponse,
  RestUndocumentedResponseError,
  unwrapRestResponse,
} from "./mod.ts";

const operation: RestOperation = {
  id: "repos/get",
  method: "POST",
  path: "/repos/{owner}/{path}",
  pathParameters: [{ name: "owner" }, { name: "path", multiSegment: true }],
  queryParameters: [{ name: "labels", style: "form", explode: false }],
  requestMediaTypes: ["application/json"],
  responses: [{ status: 200, mediaTypes: ["application/json"] }],
};

Deno.test("RestClient serializes generated requests with native Fetch types", async () => {
  let captured: Request | undefined;
  const client = new RestClient({
    baseUrl: "https://example.test/api/v1",
    headers: { authorization: "Bearer token" },
    query: { api_version: "1" },
    fetch: (input) => {
      captured = input instanceof Request ? input : new Request(input);
      return Promise.resolve(
        new Response('{"id":42}', {
          status: 200,
          headers: { "content-type": "application/json; charset=utf-8" },
        }),
      );
    },
  });

  const result = await client.request<RestResponse<200, { id: number }, "application/json", true>>(
    operation,
    {
      path: { owner: "pan git", path: "docs/read me.md" },
      query: { labels: ["bug", "help wanted"] },
      headers: { "x-provider": "fixture" },
      body: { mediaType: "application/json", value: { title: "test" } },
    },
  );

  assert(captured !== undefined, "fetch did not receive a request");
  assertEquals(
    captured.url,
    "https://example.test/api/v1/repos/pan%20git/docs/read%20me.md?api_version=1&labels=bug%2Chelp+wanted",
  );
  assertEquals(captured.headers.get("authorization"), "Bearer token");
  assertEquals(captured.headers.get("content-type"), "application/json");
  assertEquals(await captured.text(), '{"title":"test"}');
  assertEquals(result.body.id, 42);
  assertEquals(result.documented, true);
  assertEquals(result.response.status, 200);
});

Deno.test("RestClient serializes every generated request media family", async () => {
  const captured: Request[] = [];
  const client = new RestClient({
    baseUrl: "https://example.test",
    fetch: (input) => {
      captured.push(input instanceof Request ? input : new Request(input));
      return Promise.resolve(new Response(null, { status: 204 }));
    },
  });
  const request = (mediaType: string, value: unknown) =>
    client.request(
      {
        id: `fixtures/${mediaType}`,
        method: "POST",
        path: "/fixture",
        requestMediaTypes: [mediaType],
        responses: [{ status: 204, mediaTypes: [] }],
      },
      { body: { mediaType, value } },
    );

  await request("text/plain", "plain text");
  await request("application/x-www-form-urlencoded", { labels: ["bug", "help"], title: "one" });
  await request("multipart/form-data", {
    file: new Uint8Array([1, 2, 3]),
    metadata: { private: true },
  });
  await request("application/octet-stream", new Uint8Array([4, 5, 6]));

  assertEquals(await captured[0].text(), "plain text");
  assertEquals(await captured[1].text(), "labels=bug&labels=help&title=one");
  const form = await captured[2].formData();
  const file = form.get("file");
  assert(file instanceof File, "multipart binary field was not a File");
  assertEquals([...new Uint8Array(await file.arrayBuffer())].join(","), "1,2,3");
  assertEquals(form.get("metadata"), '{"private":true}');
  assertEquals(
    [...new Uint8Array(await captured[3].arrayBuffer())].join(","),
    "4,5,6",
  );
});

Deno.test("RestClient classifies parameterized request media by essence", async () => {
  const captured: Request[] = [];
  const client = new RestClient({
    baseUrl: "https://example.test",
    fetch: (input) => {
      captured.push(input instanceof Request ? input : new Request(input));
      return Promise.resolve(new Response(null, { status: 204 }));
    },
  });
  const request = (mediaType: string, value: unknown) =>
    client.request(
      {
        id: `fixtures/${mediaType}`,
        method: "POST",
        path: "/fixture",
        requestMediaTypes: [mediaType],
        responses: [{ status: 204, mediaTypes: [] }],
      },
      { body: { mediaType, value } },
    );

  const jsonMediaType = "Application/JSON; profile=fixture";
  const formMediaType = "Application/X-WWW-Form-Urlencoded; charset=UTF-8";
  const textMediaType = "Text/Plain; charset=UTF-8";
  const multipartMediaType = "Multipart/Form-Data; profile=fixture";
  await request(jsonMediaType, { title: "one" });
  await request(formMediaType, { labels: ["bug", "help"] });
  await request(textMediaType, "plain text");
  await request(multipartMediaType, { title: "multipart" });

  assertEquals(captured[0].headers.get("content-type"), jsonMediaType);
  assertEquals(await captured[0].text(), '{"title":"one"}');
  assertEquals(captured[1].headers.get("content-type"), formMediaType);
  assertEquals(await captured[1].text(), "labels=bug&labels=help");
  assertEquals(captured[2].headers.get("content-type"), textMediaType);
  assertEquals(await captured[2].text(), "plain text");
  assert(
    captured[3].headers.get("content-type")?.toLowerCase().startsWith(
      "multipart/form-data; boundary=",
    ),
    "multipart request did not let Fetch provide its boundary",
  );
  assertEquals((await captured[3].formData()).get("title"), "multipart");
});

Deno.test("RestClient matches parameterized response media by essence", async () => {
  let captured: Request | undefined;
  const jsonMediaType = "Application/Vnd.PanGit+JSON; version=1";
  const textMediaType = "Text/Plain; charset=UTF-8";
  const binaryMediaType = "Application/Zip; version=1";
  const parameterizedOperation: RestOperation = {
    id: "fixtures/parameterized-response",
    method: "POST",
    path: "/parameterized-response",
    requestMediaTypes: ["Application/JSON; profile=fixture"],
    responses: [{
      status: 200,
      mediaTypes: [binaryMediaType, textMediaType, jsonMediaType],
      decoders: {
        "application/zip": "binary",
        "text/plain": "text",
        "application/vnd.pangit+json": "json",
      },
    }],
  };
  const client = new RestClient({
    baseUrl: "https://example.test",
    fetch: (input) => {
      captured = input instanceof Request ? input : new Request(input);
      return Promise.resolve(
        new Response('{"id":42}', {
          headers: {
            "content-type": "APPLICATION/VND.PANGIT+JSON; charset=UTF-8",
          },
        }),
      );
    },
  });

  const result = await client.request<
    RestResponse<200, { id: number }, typeof jsonMediaType, true>
  >(parameterizedOperation, {
    body: {
      mediaType: "Application/JSON; profile=fixture",
      value: { title: "fixture" },
    },
  });

  assert(captured !== undefined, "fetch did not receive parameterized request");
  assertEquals(
    captured.headers.get("accept"),
    `${jsonMediaType}, ${textMediaType}, ${binaryMediaType}`,
  );
  assertEquals(
    captured.headers.get("content-type"),
    "Application/JSON; profile=fixture",
  );
  assertEquals(result.documented, true);
  assertEquals(result.mediaType, jsonMediaType);
  assertEquals(result.body.id, 42);
});

Deno.test("RestClient can return or throw typed HTTP failures", async () => {
  const failureOperation: RestOperation = {
    ...operation,
    method: "GET",
    responses: [{ status: 404, mediaTypes: ["application/json"] }],
  };
  const client = new RestClient({
    baseUrl: "https://example.test",
    fetch: () =>
      Promise.resolve(
        new Response('{"message":"missing"}', {
          status: 404,
          headers: { "content-type": "application/json" },
        }),
      ),
  });
  const input = { path: { owner: "owner", path: "repo" } };

  const result = await client.request(failureOperation, input);
  assertEquals(result.documented, true);
  assertEquals(result.ok, false);

  let error: unknown;
  try {
    await client.request(failureOperation, input, { throwOnError: true });
  } catch (caught) {
    error = caught;
  }
  assert(error instanceof RestApiError, "throwOnError did not produce RestApiError");
  assertEquals(error.result.status, 404);
});

Deno.test("RestClient raw fetch preserves base paths and query strings", async () => {
  let captured: Request | undefined;
  const client = new RestClient({
    baseUrl: "https://example.test/api/v1",
    fetch: (input) => {
      captured = input instanceof Request ? input : new Request(input);
      return Promise.resolve(new Response(null, { status: 204 }));
    },
  });

  await client.fetch("/health?verbose=true");
  assert(captured !== undefined, "fetch did not receive a request");
  assertEquals(captured.url, "https://example.test/api/v1/health?verbose=true");
});

Deno.test("RestClient raw fetch exposes arbitrary methods through honest request context", async () => {
  const transportCause = new TypeError("PURGE transport rejected");
  let headerOperation: RestRequestOperation | undefined;
  let hookOperation: RestRequestOperation | undefined;
  let captured: Request | undefined;
  const client = new RestClient({
    baseUrl: "https://example.test/api",
    headers: (requestOperation) => {
      headerOperation = requestOperation;
      return { "x-method": requestOperation.method };
    },
    beforeRequest: (request, requestOperation) => {
      hookOperation = requestOperation;
      return request;
    },
    fetch: (input) => {
      captured = input instanceof Request ? input : new Request(input);
      return Promise.reject(transportCause);
    },
  });

  const error = await captureRejection(client.fetch("/cache/item", { method: "PURGE" }));
  assert(error instanceof RestTransportError, "raw PURGE failure lacked transport context");
  assertEquals(error.cause, transportCause);
  assertEquals(error.operation.method, "PURGE");
  assertEquals(error.request.method, "PURGE");
  assertEquals(headerOperation?.method, "PURGE");
  assertEquals(hookOperation?.method, "PURGE");
  assertEquals(captured?.method, "PURGE");
  assertEquals(captured?.headers.get("x-method"), "PURGE");
  assertType<string>(error.operation.method);
  assertType<RestMethod>(operation.method);
});

Deno.test("RestClient rejects dot-only path parameter segments", async () => {
  let fetchCalls = 0;
  const client = new RestClient({
    baseUrl: "https://example.test/api/v1",
    fetch: () => {
      fetchCalls += 1;
      return Promise.resolve(new Response(null, { status: 204 }));
    },
  });
  const singleSegment: RestOperation = {
    id: "fixtures/dot-path",
    method: "GET",
    path: "/repos/{owner}/items",
    pathParameters: [{ name: "owner" }],
    responses: [{ status: 204, mediaTypes: [] }],
  };
  const multiSegment: RestOperation = {
    ...singleSegment,
    id: "fixtures/dot-multi-path",
    path: "/repos/{path}/items",
    pathParameters: [{ name: "path", multiSegment: true }],
  };

  for (const value of [".", ".."]) {
    const error = await captureRejection(
      client.request(singleSegment, { path: { owner: value } }),
    );
    assert(error instanceof TypeError, `single-segment ${value} was not rejected`);
    assertEquals(
      error.message,
      `fixtures/dot-path path parameter owner contains unsupported dot-only segment ${value}; ` +
        "native URL normalization cannot represent literal dot-only path segments",
    );
  }
  for (const value of ["group/./repo", "group/../repo"]) {
    const error = await captureRejection(
      client.request(multiSegment, { path: { path: value } }),
    );
    assert(error instanceof TypeError, `multi-segment ${value} was not rejected`);
    assertEquals(
      error.message,
      `fixtures/dot-multi-path path parameter path contains unsupported dot-only segment ${
        value.split("/")[1]
      }; native URL normalization cannot represent literal dot-only path segments`,
    );
  }
  assertEquals(fetchCalls, 0);
});

Deno.test("RestClient preserves nonempty multi-segments and rejects empty components", async () => {
  let captured: Request | undefined;
  let fetchCalls = 0;
  const client = new RestClient({
    baseUrl: "https://example.test/api",
    fetch: (input) => {
      fetchCalls += 1;
      captured = input instanceof Request ? input : new Request(input);
      return Promise.resolve(new Response(null, { status: 204 }));
    },
  });
  const multiSegment: RestOperation = {
    id: "fixtures/multi-path",
    method: "GET",
    path: "/repos/{path}/items",
    pathParameters: [{ name: "path", multiSegment: true }],
    responses: [{ status: 204, mediaTypes: [] }],
  };

  for (const value of ["a//b", "/a", "a/", "/a/"]) {
    const error = await captureRejection(
      client.request(multiSegment, { path: { path: value } }),
    );
    assert(
      error instanceof TypeError,
      `empty multi-segment component in ${value} was not rejected`,
    );
    assertEquals(
      error.message,
      "fixtures/multi-path path parameter path contains an empty multi-segment component; " +
        "native generated routing cannot preserve empty path components",
    );
  }
  assertEquals(fetchCalls, 0);

  await client.request(multiSegment, { path: { path: "a/b" } });
  assert(captured !== undefined, "valid multi-segment request did not reach fetch");
  assertEquals(captured.url, "https://example.test/api/repos/a/b/items");
  assertEquals(fetchCalls, 1);
});

Deno.test("RestClient rejects empty serialized path parameters", async () => {
  let fetchCalls = 0;
  const client = new RestClient({
    baseUrl: "https://example.test/api",
    fetch: () => {
      fetchCalls += 1;
      return Promise.resolve(new Response(null, { status: 204 }));
    },
  });
  const ordinary: RestOperation = {
    id: "fixtures/empty-owner",
    method: "GET",
    path: "/repos/{owner}/items",
    pathParameters: [{ name: "owner" }],
    responses: [{ status: 204, mediaTypes: [] }],
  };
  const optionalRef: RestOperation = {
    id: "fixtures/empty-optional-ref",
    method: "GET",
    path: "/commits/{ref}/summary",
    pathParameters: [{ name: "ref" }],
    pathGroups: [{ start: 8, end: 14, parameters: ["ref"] }],
    responses: [{ status: 204, mediaTypes: [] }],
  };

  for (const [operation, name] of [[ordinary, "owner"], [optionalRef, "ref"]] as const) {
    const error = await captureRejection(
      client.request(operation, { path: { [name]: "" } }),
    );
    assert(error instanceof TypeError, `${operation.id} accepted an empty path parameter`);
    assertEquals(
      error.message,
      `${operation.id} path parameter ${name} serializes to an empty path segment`,
    );
  }
  assertEquals(fetchCalls, 0);
});

Deno.test("RestClient includes optional path groups only when all group values are present", async () => {
  const captured: Request[] = [];
  const client = new RestClient({
    baseUrl: "https://example.test/api",
    fetch: (input) => {
      captured.push(input instanceof Request ? input : new Request(input));
      return Promise.resolve(new Response(null, { status: 204 }));
    },
  });
  const grouped: RestOperation = {
    id: "fixtures/optional-group",
    method: "GET",
    path: "/projects/{id}/refs/{owner}/{repo}/summary",
    pathParameters: [{ name: "id" }, { name: "owner" }, { name: "repo" }],
    pathGroups: [{ start: 15, end: 35, parameters: ["owner", "repo"] }],
    responses: [{ status: 204, mediaTypes: [] }],
  };
  const suffix: RestOperation = {
    id: "fixtures/optional-suffix",
    method: "GET",
    path: "/releases/latest/{suffix}",
    pathParameters: [{ name: "suffix", multiSegment: true }],
    pathGroups: [
      { start: 16, end: 17, parameters: ["suffix"] },
      { start: 17, end: 25, parameters: ["suffix"] },
    ],
    responses: [{ status: 204, mediaTypes: [] }],
  };
  const literal: RestOperation = {
    id: "fixtures/literal-group",
    method: "GET",
    path: "/groups/{id}/-/search",
    pathParameters: [{ name: "id" }],
    pathGroups: [{ start: 13, end: 15, selector: "0", defaultIncluded: true }],
    responses: [{ status: 204, mediaTypes: [] }],
  };

  await client.request(grouped, { path: { id: 7 } });
  await client.request(grouped, { path: { id: 7, owner: "space", repo: "repo" } });
  await client.request(suffix);
  await client.request(suffix, { path: { suffix: "downloads/file" } });
  await client.request(literal, { path: { id: 9 } });
  await client.request(literal, { path: { id: 9 }, pathGroups: { "0": false } });
  assertEquals(
    JSON.stringify(captured.map((request) => request.url)),
    JSON.stringify([
      "https://example.test/api/projects/7/summary",
      "https://example.test/api/projects/7/refs/space/repo/summary",
      "https://example.test/api/releases/latest",
      "https://example.test/api/releases/latest/downloads/file",
      "https://example.test/api/groups/9/-/search",
      "https://example.test/api/groups/9/search",
    ]),
  );

  const error = await captureRejection(
    client.request(grouped, { path: { id: 7, owner: "space" } }),
  );
  assert(error instanceof TypeError, "partial optional group was not rejected");
  assertEquals(
    error.message,
    "fixtures/optional-group optional path group requires all parameters together: owner, repo",
  );
  const selectorError = await captureRejection(
    client.request(literal, {
      path: { id: 9 },
      pathGroups: { "1": false } as never,
    }),
  );
  assert(selectorError instanceof TypeError, "unknown literal group selector was not rejected");
  assertEquals(
    selectorError.message,
    "fixtures/literal-group has no optional path group selector 1",
  );
  assertEquals(captured.length, 6);
});

Deno.test("RestClient strictly percent-encodes dynamic path segments", async () => {
  const captured: Request[] = [];
  const client = new RestClient({
    baseUrl: "https://example.test/api",
    fetch: (input) => {
      captured.push(input instanceof Request ? input : new Request(input));
      return Promise.resolve(new Response(null, { status: 204 }));
    },
  });
  const singleSegment: RestOperation = {
    id: "fixtures/strict-path",
    method: "GET",
    path: "/packages/{name}/static!()'*-suffix",
    pathParameters: [{ name: "name" }],
    responses: [{ status: 204, mediaTypes: [] }],
  };
  const multiSegment: RestOperation = {
    ...singleSegment,
    id: "fixtures/strict-multi-path",
    path: "/packages/{name}",
    pathParameters: [{ name: "name", multiSegment: true }],
  };

  await client.request(singleSegment, { path: { name: "pkg!'()*" } });
  await client.request(multiSegment, { path: { name: "scope!/pkg'()*" } });

  assertEquals(
    captured[0].url,
    "https://example.test/api/packages/pkg%21%27%28%29%2A/static!()'*-suffix",
  );
  assertEquals(
    captured[1].url,
    "https://example.test/api/packages/scope%21/pkg%27%28%29%2A",
  );
});

Deno.test("RestClient implements deep-object query and rejects unsupported reserved serialization", async () => {
  let captured: Request | undefined;
  const client = new RestClient({
    baseUrl: "https://example.test",
    fetch: (input) => {
      captured = input instanceof Request ? input : new Request(input);
      return Promise.resolve(new Response(null, { status: 204 }));
    },
  });
  const deepObject: RestOperation = {
    id: "fixtures/deep-object",
    method: "GET",
    path: "/items",
    queryParameters: [{ name: "filter", style: "deepObject", explode: true }],
    responses: [{ status: 204, mediaTypes: [] }],
  };

  await client.request(deepObject, {
    query: { filter: { state: "open", visible: true } },
  });
  assert(captured !== undefined, "fetch did not receive a request");
  assertEquals(
    captured.url,
    "https://example.test/items?filter%5Bstate%5D=open&filter%5Bvisible%5D=true",
  );

  const reserved = {
    ...deepObject,
    queryParameters: [{ name: "raw", allowReserved: true }],
  } satisfies RestOperation;
  const error = await captureRejection(client.request(reserved, { query: { raw: "a/b" } }));
  assert(error instanceof TypeError, "allowReserved was silently serialized incorrectly");
});

Deno.test("RestClient makes cross-origin configured-header forwarding explicit", async () => {
  const uploadOperation: RestOperation = {
    id: "fixtures/upload",
    method: "POST",
    path: "/upload",
    server: "https://uploads.example.test",
    responses: [{ status: 204, mediaTypes: [] }],
  };
  let forwarded: Request | undefined;
  const forwardClient = new RestClient({
    baseUrl: "https://api.example.test",
    headers: { authorization: "Bearer token" },
    fetch: (input) => {
      forwarded = input instanceof Request ? input : new Request(input);
      return Promise.resolve(new Response(null, { status: 204 }));
    },
  });
  await forwardClient.request(uploadOperation);
  assertEquals(forwarded?.headers.get("authorization"), "Bearer token");

  let providerCalled = false;
  let isolated: Request | undefined;
  const isolatedClient = new RestClient({
    baseUrl: "https://api.example.test",
    headerForwarding: "same-origin",
    headers: () => {
      providerCalled = true;
      return { authorization: "Bearer hidden" };
    },
    fetch: (input) => {
      isolated = input instanceof Request ? input : new Request(input);
      return Promise.resolve(new Response(null, { status: 204 }));
    },
  });
  await isolatedClient.request(uploadOperation, {}, {
    headers: { "x-explicit": "forwarded" },
  });
  assertEquals(providerCalled, false);
  assertEquals(isolated?.headers.get("authorization"), null);
  assertEquals(isolated?.headers.get("x-explicit"), "forwarded");
});

Deno.test("RestClient applies configured headers from the final request origin", async () => {
  const configured = {
    authorization: "Bearer configured",
    "x-configured": "configured",
  };
  const baseOrigin = "https://api.example.test";
  const otherOrigin = "https://uploads.example.test";
  const sameOriginOperation: RestOperation = {
    id: "fixtures/final-header-origin-base",
    method: "GET",
    path: "/from-base",
    responses: [{ status: 204, mediaTypes: [] }],
  };
  const crossOriginOperation: RestOperation = {
    ...sameOriginOperation,
    id: "fixtures/final-header-origin-upload",
    path: "/from-upload",
    server: otherOrigin,
  };

  for (const mode of ["generated", "raw"] as const) {
    for (const providerKind of ["static", "sync", "async"] as const) {
      const providerContexts: string[] = [];
      const captured: Request[] = [];
      const headers = providerKind === "static"
        ? configured
        : (_operation: RestRequestOperation, context: { readonly url: string }) => {
          providerContexts.push(context.url);
          return providerKind === "async" ? Promise.resolve(configured) : configured;
        };
      const client = new RestClient({
        baseUrl: baseOrigin,
        headerForwarding: "same-origin",
        headers,
        beforeRequest: (request) => {
          const target = new URL(request.url);
          target.host = target.origin === baseOrigin
            ? new URL(otherOrigin).host
            : new URL(baseOrigin).host;
          const replacementHeaders = new Headers(request.headers);
          replacementHeaders.set("x-hook", "added");
          return new Request(target, {
            headers: replacementHeaders,
            method: request.method,
            signal: request.signal,
          });
        },
        fetch: (input) => {
          captured.push(input instanceof Request ? input : new Request(input));
          return Promise.resolve(new Response(null, { status: 204 }));
        },
      });
      const explicitHeaders = {
        authorization: "Bearer explicit",
        "x-explicit": "explicit",
      };

      if (mode === "generated") {
        await client.request(sameOriginOperation, {}, { headers: explicitHeaders });
        await client.request(crossOriginOperation);
      } else {
        await client.fetch("/from-base", { headers: explicitHeaders });
        await client.fetch(`${otherOrigin}/from-upload`);
      }

      assertEquals(captured[0].url, `${otherOrigin}/from-base`);
      assertEquals(captured[0].headers.get("authorization"), "Bearer explicit");
      assertEquals(captured[0].headers.get("x-explicit"), "explicit");
      assertEquals(captured[0].headers.get("x-hook"), "added");
      assertEquals(captured[0].headers.get("x-configured"), null);
      assertEquals(captured[1].url, `${baseOrigin}/from-upload`);
      assertEquals(captured[1].headers.get("authorization"), "Bearer configured");
      assertEquals(captured[1].headers.get("x-configured"), "configured");
      assertEquals(captured[1].headers.get("x-hook"), "added");
      if (providerKind !== "static") {
        assertEquals(providerContexts.length, 1);
        assertEquals(providerContexts[0], `${baseOrigin}/from-upload`);
      }
    }
  }
});

Deno.test("RestClient shares hook and default-header ordering across generated and raw requests", async () => {
  const fixture: RestOperation = {
    id: "fixtures/hook-order",
    method: "GET",
    path: "/before",
    responses: [{ status: 204, mediaTypes: [] }],
  };

  for (const mode of ["generated", "raw"] as const) {
    const phases: string[] = [];
    const controller = new AbortController();
    let finalContext: RestRequestContext | undefined;
    const client = new RestClient({
      baseUrl: "https://example.test",
      beforeRequest: (request, requestOperation, context) => {
        phases.push("beforeRequest");
        assertEquals(requestOperation.id, mode === "raw" ? "raw:GET" : fixture.id);
        assertEquals(context.url, "https://example.test/before");
        assertEquals(context.signal, controller.signal);
        assertEquals(request.headers.get("x-default"), null);
        const headers = new Headers(request.headers);
        headers.set("x-priority", "hook");
        return new Request("https://example.test/after", { headers, signal: request.signal });
      },
      headers: (_operation, context) => {
        phases.push("headers");
        finalContext = context;
        assertEquals(context.url, "https://example.test/after");
        return { "x-default": "configured", "x-priority": "configured" };
      },
      fetch: (input) => {
        phases.push("fetch");
        assert(input instanceof Request, "transport must receive the final Request");
        assertEquals(input.headers.get("x-default"), "configured");
        assertEquals(input.headers.get("x-priority"), "hook");
        assertEquals(input.signal, finalContext?.signal);
        return Promise.resolve(new Response(null, { status: 204 }));
      },
      afterResponse: (response, request, _operation, context) => {
        phases.push("afterResponse");
        assertEquals(context, finalContext);
        assertEquals(request.url, context.url);
        return response;
      },
    });

    if (mode === "generated") {
      await client.request(fixture, {}, { signal: controller.signal });
    } else {
      await client.fetch("/before", { signal: controller.signal });
    }
    assertEquals(phases.join(","), "beforeRequest,headers,fetch,afterResponse");
  }
});

Deno.test("RestClient matches a response before using generated decode metadata", async () => {
  const decodedOperation: RestOperation = {
    id: "fixtures/decode",
    method: "GET",
    path: "/decode",
    responses: [{
      status: 200,
      mediaTypes: ["application/vnd.pangit.fixture"],
      decoders: { "application/vnd.pangit.fixture": "json" },
    }],
  };
  const client = new RestClient({
    baseUrl: "https://example.test",
    fetch: () =>
      Promise.resolve(
        new Response('{"id":42}', {
          headers: { "content-type": "application/vnd.pangit.fixture" },
        }),
      ),
  });

  const result = await client.request<
    RestResponse<200, { id: number }, "application/vnd.pangit.fixture", true>
  >(decodedOperation);

  assertEquals(result.documented, true);
  assertEquals(result.body.id, 42);
});

Deno.test("RestClient matches default response metadata for an unlisted status", async () => {
  const defaultOperation: RestOperation = {
    id: "fixtures/default-response",
    method: "GET",
    path: "/default-response",
    responses: [
      { status: 200, mediaTypes: ["text/plain"], decoders: { "text/plain": "text" } },
      {
        status: "default",
        mediaTypes: ["application/vnd.pangit.error"],
        decoders: { "application/vnd.pangit.error": "json" },
      },
    ],
  };
  const client = new RestClient({
    baseUrl: "https://example.test",
    fetch: () =>
      Promise.resolve(
        new Response('{"message":"teapot"}', {
          status: 418,
          headers: { "content-type": "application/vnd.pangit.error" },
        }),
      ),
  });
  const result = await client.request<
    RestResponse<
      number,
      { message: string },
      "application/vnd.pangit.error",
      boolean
    >
  >(defaultOperation);

  assertType<boolean>(result.ok);
  assertEquals(result.documented, true);
  assertEquals(result.status, 418);
  assertEquals(result.ok, false);
  assertEquals(result.body.message, "teapot");
});

Deno.test("RestClient buffers multipart responses as Blob", async () => {
  const multipartOperation: RestOperation = {
    id: "fixtures/multipart-response",
    method: "GET",
    path: "/multipart-response",
    responses: [{
      status: 200,
      mediaTypes: ["multipart/form-data"],
      decoders: { "multipart/form-data": "binary" },
    }],
  };
  const client = new RestClient({
    baseUrl: "https://example.test",
    fetch: () =>
      Promise.resolve(
        new Response(new Uint8Array([1, 2, 3]), {
          headers: { "content-type": "multipart/form-data; boundary=fixture" },
        }),
      ),
  });
  const result = await client.request<
    RestResponse<200, Blob, "multipart/form-data", true>
  >(multipartOperation);

  assert(result.body instanceof Blob, "multipart response decoder did not return Blob");
  assertEquals(result.body.type, "multipart/form-data; boundary=fixture");
  assertEquals([...new Uint8Array(await result.body.arrayBuffer())].join(","), "1,2,3");
});

Deno.test("RestClient chooses Accept from successful responses before failure responses", async () => {
  let captured: Request | undefined;
  const downloadOperation: RestOperation = {
    id: "fixtures/download",
    method: "GET",
    path: "/download",
    responses: [
      {
        status: 200,
        mediaTypes: ["application/zip", "text/csv"],
        decoders: { "application/zip": "binary", "text/csv": "text" },
      },
      {
        status: 404,
        mediaTypes: ["application/json"],
        decoders: { "application/json": "json" },
      },
    ],
  };
  const client = new RestClient({
    baseUrl: "https://example.test",
    fetch: (input) => {
      captured = input instanceof Request ? input : new Request(input);
      return Promise.resolve(
        new Response(new Uint8Array([1, 2, 3]), {
          headers: { "content-type": "application/zip" },
        }),
      );
    },
  });

  const result = await client.request<RestResponse<200, Blob, "application/zip", true>>(
    downloadOperation,
  );

  assert(captured !== undefined, "fetch did not receive a request");
  assertEquals(captured.headers.get("accept"), "text/csv, application/zip");
  assert(result.body instanceof Blob, "binary generated decoder did not return a Blob");
});

Deno.test("RestClient reports missing and unexpected content types as undocumented", async () => {
  const contentOperation: RestOperation = {
    id: "fixtures/content-type",
    method: "GET",
    path: "/content-type",
    responses: [{
      status: 200,
      mediaTypes: ["application/json"],
      decoders: { "application/json": "json" },
    }],
  };
  const responses = [
    new Response(new TextEncoder().encode('{"id":1}')),
    new Response("plain", { headers: { "content-type": "text/plain" } }),
  ];
  const client = new RestClient({
    baseUrl: "https://example.test",
    fetch: () => Promise.resolve(responses.shift()!),
  });

  const missing = await client.request(contentOperation);
  assertEquals(missing.documented, false);
  assertEquals(missing.mediaType, undefined);
  assertEquals(missing.body, '{"id":1}');

  const unexpected = await client.request(contentOperation);
  assertEquals(unexpected.documented, false);
  assertEquals(unexpected.mediaType, "text/plain");
  assertEquals(unexpected.body, "plain");

  const contentlessResponses = [
    new Response(null),
    new Response("unexpected bytes"),
  ];
  const contentlessClient = new RestClient({
    baseUrl: "https://example.test",
    fetch: () => Promise.resolve(contentlessResponses.shift()!),
  });
  const contentlessOperation: RestOperation = {
    id: "fixtures/contentless-200",
    method: "GET",
    path: "/contentless",
    responses: [{ status: 200, mediaTypes: [] }],
  };
  const empty = await contentlessClient.request(contentlessOperation);
  assertEquals(empty.documented, true);
  assertEquals(empty.body, undefined);
  const nonempty = await contentlessClient.request(contentlessOperation);
  assertEquals(nonempty.documented, false);
  assertEquals(nonempty.body, "unexpected bytes");
  assertEquals(nonempty.response.bodyUsed, true);
});

Deno.test("RestClient enforces HEAD, 204, and 205 no-content semantics", async () => {
  const responses = [204, 205].map((status) =>
    new Response(null, {
      status,
      headers: { "content-type": "application/json" },
    })
  );
  const client = new RestClient({
    baseUrl: "https://example.test",
    fetch: () => Promise.resolve(responses.shift()!),
  });

  for (const status of [204, 205]) {
    const noContentOperation: RestOperation = {
      id: `fixtures/no-content-${status}`,
      method: "DELETE",
      path: "/no-content",
      responses: [{ status, mediaTypes: [] }],
    };
    const result = await client.request(noContentOperation, {}, { parseAs: "json" });
    assertEquals(result.documented, true);
    assertEquals(result.status, status);
    assertEquals(result.mediaType, undefined);
    assertEquals(result.body, undefined);
  }

  const headClient = new RestClient({
    baseUrl: "https://example.test",
    fetch: () =>
      Promise.resolve(
        new Response(null, { headers: { "content-type": "application/json" } }),
      ),
  });
  const headResult = await headClient.request({
    id: "fixtures/head-no-content",
    method: "HEAD",
    path: "/no-content",
    responses: [{
      status: 200,
      mediaTypes: ["application/json"],
      decoders: { "application/json": "json" },
    }],
  });
  assertEquals(headResult.documented, true);
  assertEquals(headResult.mediaType, undefined);
  assertEquals(headResult.body, undefined);
});

Deno.test("RestClient preserves JSON null and exact unsafe integers", async () => {
  let captured: Request | undefined;
  const integerOperation: RestOperation = {
    id: "fixtures/int64",
    method: "POST",
    path: "/int64",
    requestMediaTypes: ["application/json"],
    responses: [{
      status: 200,
      mediaTypes: ["application/json"],
      decoders: { "application/json": "json" },
    }],
  };
  const client = new RestClient({
    baseUrl: "https://example.test",
    fetch: (input) => {
      captured = input instanceof Request ? input : new Request(input);
      return Promise.resolve(
        new Response('{"safe":42,"maximum":9223372036854775807,"minimum":-9223372036854775808}', {
          headers: { "content-type": "application/json" },
        }),
      );
    },
  });
  const maximum: RestInt64 = 9223372036854775807n;
  const minimum: RestInt64 = -9223372036854775808n;

  const result = await client.request<
    RestResponse<
      200,
      { safe: RestInt64; maximum: RestInt64; minimum: RestInt64 },
      "application/json",
      true
    >
  >(
    integerOperation,
    { body: { mediaType: "application/json", value: { maximum, minimum } } },
  );

  assert(captured !== undefined, "fetch did not receive a request");
  assertEquals(
    await captured.text(),
    '{"maximum":9223372036854775807,"minimum":-9223372036854775808}',
  );
  assertEquals(result.body.safe, 42);
  assertEquals(result.body.maximum, 9223372036854775807n);
  assertEquals(result.body.minimum, -9223372036854775808n);

  const unsafeNumberError = await captureRejection(
    client.request(integerOperation, {
      body: { mediaType: "application/json", value: { value: Number.MAX_SAFE_INTEGER + 1 } },
    }),
  );
  assert(unsafeNumberError instanceof RangeError, "unsafe integer number was serialized silently");

  const unsafePathError = await captureRejection(
    client.request(
      { ...integerOperation, path: "/int64/{id}", pathParameters: [{ name: "id" }] },
      { path: { id: Number.MAX_SAFE_INTEGER + 1 } },
    ),
  );
  assert(
    unsafePathError instanceof RangeError,
    "unsafe integer path value was serialized silently",
  );

  const exponentClient = new RestClient({
    baseUrl: "https://example.test",
    fetch: () =>
      Promise.resolve(
        new Response(
          '{"positiveExponent":1e+18,"negativeExponent":1200000000000000000000e-3,' +
            '"integralDecimal":100000000000000000000.0,"safeIntegralExponent":1.2e3,' +
            '"safeNegativeExponent":1.25e-3,"negativeValue":-1e+18}',
          {
            headers: { "content-type": "application/json" },
          },
        ),
      ),
  });
  const exponentResult = await exponentClient.request<
    RestResponse<
      200,
      {
        positiveExponent: RestJsonNumber;
        negativeExponent: RestJsonNumber;
        integralDecimal: RestJsonNumber;
        safeIntegralExponent: RestJsonNumber;
        safeNegativeExponent: RestJsonNumber;
        negativeValue: RestJsonNumber;
      },
      "application/json",
      true
    >
  >(integerOperation);
  assertEquals(exponentResult.body.positiveExponent, 1000000000000000000n);
  assertEquals(exponentResult.body.negativeExponent, 1200000000000000000n);
  assertEquals(exponentResult.body.integralDecimal, 100000000000000000000n);
  assertEquals(exponentResult.body.safeIntegralExponent, 1200);
  assertEquals(exponentResult.body.safeNegativeExponent, 0.00125);
  assertEquals(exponentResult.body.negativeValue, -1000000000000000000n);

  const lossyFractionClient = new RestClient({
    baseUrl: "https://example.test",
    fetch: () =>
      Promise.resolve(
        new Response('{"value":9007199254740993.5}', {
          headers: { "content-type": "application/json" },
        }),
      ),
  });
  const fractionError = await captureRejection(lossyFractionClient.request(integerOperation));
  assert(
    fractionError instanceof RestParseError,
    "unsafe non-integral number was accepted with precision loss",
  );
  assert(
    fractionError.cause instanceof RangeError,
    "unsafe non-integral number did not retain range cause",
  );

  const hugeExponentClient = new RestClient({
    baseUrl: "https://example.test",
    fetch: () =>
      Promise.resolve(
        new Response('{"value":1e1000000000}', {
          headers: { "content-type": "application/json" },
        }),
      ),
  });
  const hugeExponentError = await captureRejection(hugeExponentClient.request(integerOperation));
  assert(hugeExponentError instanceof RestParseError, "huge compact exponent was accepted");
  assert(hugeExponentError.cause instanceof RangeError, "huge exponent lacked range cause");
  assertEquals(
    hugeExponentError.cause.message,
    "JSON response integer exceeds the 10000-digit safety limit: 1e1000000000",
  );

  let nullRequest: Request | undefined;
  const nullClient = new RestClient({
    baseUrl: "https://example.test",
    fetch: (input) => {
      nullRequest = input instanceof Request ? input : new Request(input);
      return Promise.resolve(new Response(null, { status: 204 }));
    },
  });
  await nullClient.request(
    { ...integerOperation, responses: [{ status: 204, mediaTypes: [] }] },
    { body: { mediaType: "application/json", value: null } },
  );
  assert(nullRequest !== undefined, "fetch did not receive a JSON null request");
  assertEquals(await nullRequest.text(), "null");
});

Deno.test("RestClient rejects JSON values that would be silently omitted", async () => {
  let fetchCalls = 0;
  let captured: Request | undefined;
  const client = new RestClient({
    baseUrl: "https://example.test",
    fetch: (input) => {
      fetchCalls += 1;
      captured = input instanceof Request ? input : new Request(input);
      return Promise.resolve(new Response(null, { status: 204 }));
    },
  });
  const jsonOperation: RestOperation = {
    id: "fixtures/strict-json-input",
    method: "POST",
    path: "/strict-json-input",
    requestMediaTypes: ["application/json"],
    responses: [{ status: 204, mediaTypes: [] }],
  };
  const request = (value: unknown) =>
    client.request(jsonOperation, {
      body: { mediaType: "application/json", value },
    });
  const invalidValues: readonly [unknown, string][] = [
    [undefined, "Top-level JSON request value cannot be undefined"],
    [() => undefined, "JSON request values cannot contain function"],
    [Symbol("top-level"), "JSON request values cannot contain symbol"],
    [{ nested: () => undefined }, "JSON request values cannot contain function"],
    [[Symbol("nested")], "JSON request values cannot contain symbol"],
  ];

  for (const [value, message] of invalidValues) {
    const error = await captureRejection(request(value));
    assert(error instanceof TypeError, `${message} did not produce TypeError`);
    assertEquals(error.message, message);
  }
  assertEquals(fetchCalls, 0);

  await request({ present: true, optional: undefined });
  assert(captured !== undefined, "valid JSON request did not reach fetch");
  assertEquals(await captured.text(), '{"present":true}');
  assertEquals(fetchCalls, 1);
});

Deno.test("RestClient rejects non-finite JSON and primitive request values", async () => {
  let fetchCalls = 0;
  const client = new RestClient({
    baseUrl: "https://example.test",
    fetch: () => {
      fetchCalls += 1;
      return Promise.resolve(new Response(null, { status: 204 }));
    },
  });
  const bodyOperation: RestOperation = {
    id: "fixtures/non-finite-body",
    method: "POST",
    path: "/body",
    requestMediaTypes: ["application/json"],
    responses: [{ status: 204, mediaTypes: [] }],
  };
  const primitiveOperation: RestOperation = {
    id: "fixtures/non-finite-primitive",
    method: "GET",
    path: "/values/{path}",
    pathParameters: [{ name: "path" }],
    queryParameters: [{ name: "query" }],
    responses: [{ status: 204, mediaTypes: [] }],
  };

  for (const value of [NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    const jsonError = await captureRejection(
      client.request(bodyOperation, {
        body: { mediaType: "application/json", value: { nested: value } },
      }),
    );
    assert(jsonError instanceof RangeError, `${String(value)} JSON value was accepted`);
    assertEquals(jsonError.message, `JSON request numbers must be finite: ${String(value)}`);

    for (const channel of ["path", "query", "header"] as const) {
      const input = channel === "path"
        ? { path: { path: value } }
        : channel === "query"
        ? { path: { path: "safe" }, query: { query: value } }
        : { path: { path: "safe" }, headers: { "x-value": value } };
      const primitiveError = await captureRejection(client.request(primitiveOperation, input));
      assert(
        primitiveError instanceof RangeError,
        `${String(value)} ${channel} value was accepted`,
      );
      assertEquals(
        primitiveError.message,
        `Path/query/header numbers must be finite: ${String(value)}`,
      );
    }
  }
  assertEquals(fetchCalls, 0);
});

Deno.test("RestClient aborts every asynchronous pipeline phase with shared context", async () => {
  const abortOperation: RestOperation = {
    id: "fixtures/abort",
    method: "GET",
    path: "/abort",
    responses: [{
      status: 200,
      mediaTypes: ["text/plain"],
      decoders: { "text/plain": "text" },
    }],
  };
  const phases = ["headers", "beforeRequest", "fetch", "afterResponse", "parse"] as const;

  for (const phase of phases) {
    const reached = deferred<void>();
    const blocked = deferred<never>();
    let contextSignal: AbortSignal | undefined;
    let parseCancellationReason: unknown;
    const client = new RestClient({
      baseUrl: "https://example.test",
      headers: phase === "headers"
        ? (_operation, context) => {
          contextSignal = context.signal;
          reached.resolve();
          return blocked.promise;
        }
        : undefined,
      beforeRequest: phase === "beforeRequest"
        ? (_request, _operation, context) => {
          contextSignal = context.signal;
          reached.resolve();
          return blocked.promise;
        }
        : undefined,
      fetch: (input) => {
        const request = input instanceof Request ? input : new Request(input);
        if (phase === "fetch" || phase === "parse") {
          contextSignal = request.signal;
        }
        if (phase === "fetch") {
          reached.resolve();
          return blocked.promise;
        }
        if (phase === "parse") {
          return Promise.resolve(
            new Response(
              new ReadableStream({
                pull() {
                  reached.resolve();
                  return blocked.promise;
                },
                cancel(reason) {
                  parseCancellationReason = reason;
                },
              }, { highWaterMark: 0 }),
              { headers: { "content-type": "text/plain" } },
            ),
          );
        }
        return Promise.resolve(
          new Response("done", { headers: { "content-type": "text/plain" } }),
        );
      },
      afterResponse: phase === "afterResponse"
        ? (_response, _request, _operation, context) => {
          contextSignal = context.signal;
          reached.resolve();
          return blocked.promise;
        }
        : undefined,
    });
    const controller = new AbortController();
    const reason = new DOMException(`cancel ${phase}`, "AbortError");
    const pending = client.request(abortOperation, {}, { signal: controller.signal });

    await reached.promise;
    controller.abort(reason);
    const error = await captureRejection(pending);

    assert(error === reason, `${phase} cancellation did not preserve AbortSignal.reason`);
    assert(contextSignal?.aborted, `${phase} did not receive an AbortSignal linked to the request`);
    if (phase === "parse") {
      assert(
        parseCancellationReason === reason,
        `response body cancellation reason was ${String(parseCancellationReason)}`,
      );
    }
  }

  let called = false;
  const client = new RestClient({
    baseUrl: "https://example.test",
    headers: () => {
      called = true;
      return {};
    },
    fetch: () => Promise.resolve(new Response()),
  });
  const controller = new AbortController();
  const reason = new DOMException("pre-aborted", "AbortError");
  controller.abort(reason);
  const error = await captureRejection(
    client.request(abortOperation, {}, { signal: controller.signal }),
  );
  assert(error === reason, "pre-aborted request did not preserve AbortSignal.reason");
  assertEquals(called, false);

  const fetchReached = deferred<void>();
  const fetchBlocked = deferred<never>();
  let replacementSignal: AbortSignal | undefined;
  const replacementClient = new RestClient({
    baseUrl: "https://example.test",
    beforeRequest: (request) => new Request(request.url),
    fetch: (input) => {
      replacementSignal = input instanceof Request ? input.signal : new Request(input).signal;
      fetchReached.resolve();
      return fetchBlocked.promise;
    },
  });
  const replacementController = new AbortController();
  const replacementReason = new DOMException("replacement", "AbortError");
  const replacementPending = replacementClient.request(abortOperation, {}, {
    signal: replacementController.signal,
  });
  await fetchReached.promise;
  replacementController.abort(replacementReason);
  assertEquals(await captureRejection(replacementPending), replacementReason);
  assert(replacementSignal?.aborted, "replacement Request lost transport cancellation");

  let timeoutContext: { signal?: AbortSignal; url: string } | undefined;
  const timeoutClient = new RestClient({
    baseUrl: "https://example.test/api",
    headers: (_operation, context) => {
      timeoutContext = context;
      return new Promise<HeadersInit>(() => {});
    },
    fetch: () => Promise.resolve(new Response()),
  });
  const timeoutError = await captureRejection(
    timeoutClient.request(abortOperation, {}, { signal: AbortSignal.timeout(1) }),
  );
  assert(timeoutError instanceof DOMException && timeoutError.name === "TimeoutError", "timeout");
  assertEquals(timeoutContext?.url, "https://example.test/api/abort");
});

Deno.test("RestClient honors beforeRequest replacement URL and signal downstream", async () => {
  const replacementOperation: RestOperation = {
    id: "fixtures/replacement",
    method: "GET",
    path: "/original",
    responses: [{ status: 204, mediaTypes: [] }],
  };

  for (const mode of ["generated", "raw"] as const) {
    const originalController = new AbortController();
    const replacementController = new AbortController();
    const afterResponseReached = deferred<void>();
    const afterResponseBlocked = deferred<never>();
    const replacementUrl = `https://replacement.example/${mode}`;
    let sentRequest: Request | undefined;
    let afterResponseUrl: string | undefined;
    let afterResponseSignal: AbortSignal | undefined;
    const client = new RestClient({
      baseUrl: "https://example.test/api",
      beforeRequest: () => new Request(replacementUrl, { signal: replacementController.signal }),
      fetch: (input) => {
        sentRequest = input instanceof Request ? input : new Request(input);
        return Promise.resolve(new Response(null, { status: 204 }));
      },
      afterResponse: (_response, _request, _operation, context) => {
        afterResponseUrl = context.url;
        afterResponseSignal = context.signal;
        afterResponseReached.resolve();
        return afterResponseBlocked.promise;
      },
    });
    const pending = mode === "generated"
      ? client.request(replacementOperation, {}, { signal: originalController.signal })
      : client.fetch("/original", { signal: originalController.signal });

    await afterResponseReached.promise;
    assert(sentRequest !== undefined, `${mode} replacement did not reach fetch`);
    assertEquals(sentRequest.url, replacementUrl);
    assertEquals(afterResponseUrl, replacementUrl);
    assert(afterResponseSignal === sentRequest.signal, `${mode} hook context used another signal`);

    const reason = new DOMException(`${mode} replacement cancelled`, "AbortError");
    replacementController.abort(reason);
    assertEquals(await captureRejection(pending), reason);
    assert(sentRequest.signal.aborted, `${mode} transport ignored replacement signal`);
    assertEquals(originalController.signal.aborted, false);
  }
});

Deno.test("RestClient cancels current and late replacement request bodies after hook abort", async () => {
  const requestOperation: RestOperation = {
    id: "fixtures/request-hook-abort",
    method: "POST",
    path: "/request-hook-abort",
    responses: [{ status: 204, mediaTypes: [] }],
  };

  for (const mode of ["generated", "raw"] as const) {
    for (const replacementKind of ["distinct", "same"] as const) {
      const hookReached = deferred<void>();
      const hookResult = deferred<Request>();
      const currentCancellationReasons: unknown[] = [];
      const replacementCancellationReasons: unknown[] = [];
      const currentBody = new ReadableStream<Uint8Array>({
        cancel(reason) {
          currentCancellationReasons.push(reason);
        },
      }, { highWaterMark: 0 });
      const replacementRequest = new Request("https://replacement.example/late", {
        body: new ReadableStream<Uint8Array>({
          cancel(reason) {
            replacementCancellationReasons.push(reason);
          },
        }, { highWaterMark: 0 }),
        method: "POST",
      });
      let currentRequest: Request | undefined;
      let fetchCalls = 0;
      const client = new RestClient({
        baseUrl: "https://example.test",
        beforeRequest: (request) => {
          currentRequest = request;
          hookReached.resolve();
          return hookResult.promise;
        },
        fetch: () => {
          fetchCalls += 1;
          return Promise.resolve(new Response(null, { status: 204 }));
        },
      });
      const controller = new AbortController();
      const pending = mode === "generated"
        ? client.request(requestOperation, {}, { body: currentBody, signal: controller.signal })
        : client.fetch("/request-hook-abort", {
          body: currentBody,
          method: "POST",
          signal: controller.signal,
        });
      await hookReached.promise;

      const reason = new DOMException(`${mode} ${replacementKind} request hook`, "AbortError");
      controller.abort(reason);
      assertEquals(await captureRejection(pending), reason);
      assertEquals(currentCancellationReasons.length, 1);
      assertEquals(currentCancellationReasons[0], reason);
      assert(currentRequest !== undefined, `${mode} hook did not receive current request`);

      hookResult.resolve(replacementKind === "distinct" ? replacementRequest : currentRequest);
      await Promise.resolve();
      await Promise.resolve();
      assertEquals(currentCancellationReasons.length, 1);
      assertEquals(replacementCancellationReasons.length, replacementKind === "distinct" ? 1 : 0);
      if (replacementKind === "distinct") {
        assertEquals(replacementCancellationReasons[0], reason);
      }
      assertEquals(fetchCalls, 0);
    }
  }
});

Deno.test("RestClient owns discarded request bodies on hook replacement and rejection", async () => {
  const requestOperation: RestOperation = {
    id: "fixtures/request-hook-ownership",
    method: "POST",
    path: "/request-hook-ownership",
    responses: [{ status: 204, mediaTypes: [] }],
  };

  for (const mode of ["generated", "raw"] as const) {
    for (const outcome of ["distinct", "same", "rejection"] as const) {
      const cancellationReasons: unknown[] = [];
      const body = new ReadableStream<Uint8Array>({
        cancel(reason) {
          cancellationReasons.push(reason);
        },
      }, { highWaterMark: 0 });
      const hookError = new Error(`${mode} beforeRequest rejection`);
      let fetchCalls = 0;
      const client = new RestClient({
        baseUrl: "https://example.test",
        beforeRequest: (request) => {
          if (outcome === "same") return request;
          if (outcome === "rejection") throw hookError;
          return new Request(request.url, { method: request.method });
        },
        fetch: () => {
          fetchCalls += 1;
          return Promise.resolve(new Response(null, { status: 204 }));
        },
      });
      const pending = mode === "generated"
        ? client.request(requestOperation, {}, { body })
        : client.fetch("/request-hook-ownership", { body, method: "POST" });

      if (outcome === "rejection") {
        assertEquals(await captureRejection(pending), hookError);
        assertEquals(cancellationReasons.length, 1);
        assertEquals(cancellationReasons[0], hookError);
        assertEquals(fetchCalls, 0);
      } else {
        await pending;
        assertEquals(fetchCalls, 1);
        assertEquals(cancellationReasons.length, outcome === "distinct" ? 1 : 0);
        if (outcome === "distinct") {
          const reason = cancellationReasons[0];
          assert(reason instanceof Error, `${mode} replacement cancellation lacked Error reason`);
          assertEquals(
            reason.message,
            "Request body discarded after beforeRequest returned a replacement",
          );
        }
      }
    }
  }
});

Deno.test("RestClient keeps returned response streams bound to cancellation", async () => {
  const pullReached = deferred<void>();
  const pullBlocked = deferred<never>();
  let sourceCancellationReason: unknown;
  const responseBody = new ReadableStream<Uint8Array>({
    pull() {
      pullReached.resolve();
      return pullBlocked.promise;
    },
    cancel(reason) {
      sourceCancellationReason = reason;
    },
  }, { highWaterMark: 0 });
  const streamOperation: RestOperation = {
    id: "fixtures/stream",
    method: "GET",
    path: "/stream",
    responses: [{
      status: 200,
      mediaTypes: ["application/octet-stream"],
      decoders: { "application/octet-stream": "binary" },
    }],
  };
  const client = new RestClient({
    baseUrl: "https://example.test",
    fetch: () =>
      Promise.resolve(
        new Response(responseBody, { headers: { "content-type": "application/octet-stream" } }),
      ),
  });
  const controller = new AbortController();
  const result = await client.request(streamOperation, {}, {
    parseAs: "stream",
    signal: controller.signal,
  });
  assert(result.body instanceof ReadableStream, "stream parser did not return response stream");
  const reader = result.body.getReader();
  const pendingRead = reader.read();
  await pullReached.promise;

  const reason = new DOMException("cancel returned stream", "AbortError");
  controller.abort(reason);
  assertEquals(await captureRejection(pendingRead), reason);
  await Promise.resolve();
  assertEquals(sourceCancellationReason, reason);
});

Deno.test("RestClient binds response envelopes returned without consuming bodies", async () => {
  const envelopeOperation: RestOperation = {
    id: "fixtures/response-envelope",
    method: "GET",
    path: "/response-envelope",
    responses: [{
      status: 200,
      mediaTypes: ["application/octet-stream"],
      decoders: { "application/octet-stream": "binary" },
    }],
  };

  for (const parseAs of ["response", "none"] as const) {
    const pullReached = deferred<void>();
    let sourceCancellationReason: unknown;
    const sourceBody = new ReadableStream<Uint8Array>({
      pull() {
        pullReached.resolve();
        return new Promise<void>(() => {});
      },
      cancel(reason) {
        sourceCancellationReason = reason;
      },
    }, { highWaterMark: 0 });
    const client = new RestClient({
      baseUrl: "https://example.test",
      fetch: () =>
        Promise.resolve(
          new Response(sourceBody, {
            headers: { "content-type": "application/octet-stream" },
          }),
        ),
    });
    const controller = new AbortController();
    const result = await client.request(envelopeOperation, {}, {
      parseAs,
      signal: controller.signal,
    });

    if (parseAs === "response") {
      assertEquals(result.body, result.response);
    } else {
      assertEquals(result.body, undefined);
    }
    assert(result.response.body !== null, `${parseAs} envelope response body was missing`);
    const reader = result.response.body.getReader();
    const readOutcome = reader.read().then(
      (value) => ({ kind: "resolved" as const, value }),
      (error: unknown) => ({ kind: "rejected" as const, error }),
    );
    await pullReached.promise;

    const reason = new DOMException(`cancel ${parseAs} envelope`, "AbortError");
    controller.abort(reason);
    const deadline = Symbol("deadline");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const outcome = await Promise.race([
      readOutcome,
      new Promise<symbol>((resolve) => {
        timer = setTimeout(() => resolve(deadline), 250);
      }),
    ]);
    if (timer !== undefined) clearTimeout(timer);
    if (typeof outcome === "symbol") {
      await reader.cancel("test cleanup");
      throw new Error(`${parseAs} envelope read remained pending after request abort`);
    }
    assertEquals(outcome.kind, "rejected");
    if (outcome.kind === "rejected") assertEquals(outcome.error, reason);
    await Promise.resolve();
    assertEquals(sourceCancellationReason, reason);
  }
});

Deno.test("RestClient raw fetch binds injected response bodies to cancellation", async () => {
  const pullReached = deferred<void>();
  let sourceCancellationReason: unknown;
  const sourceBody = new ReadableStream<Uint8Array>({
    pull() {
      pullReached.resolve();
      return new Promise<void>(() => {});
    },
    cancel(reason) {
      sourceCancellationReason = reason;
    },
  }, { highWaterMark: 0 });
  const sourceResponse = new Response(sourceBody, {
    status: 206,
    statusText: "Partial Content",
    headers: { "content-type": "application/octet-stream", "x-source": "fixture" },
  });
  Object.defineProperty(sourceResponse, "url", {
    configurable: true,
    value: "https://transport.example.test/content",
  });
  const client = new RestClient({
    baseUrl: "https://example.test",
    fetch: () => Promise.resolve(sourceResponse),
  });
  const controller = new AbortController();
  const response = await client.fetch("/content", { signal: controller.signal });

  assertEquals(response.status, 206);
  assertEquals(response.statusText, "Partial Content");
  assertEquals(response.headers.get("x-source"), "fixture");
  assertEquals(response.url, "https://transport.example.test/content");
  assert(response.body !== null, "raw response body was missing");
  const reader = response.body.getReader();
  const readOutcome = reader.read().then(
    (value) => ({ kind: "resolved" as const, value }),
    (error: unknown) => ({ kind: "rejected" as const, error }),
  );
  await pullReached.promise;

  const reason = new DOMException("cancel raw response stream", "AbortError");
  controller.abort(reason);
  const deadline = Symbol("deadline");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const outcome = await Promise.race([
    readOutcome,
    new Promise<symbol>((resolve) => {
      timer = setTimeout(() => resolve(deadline), 250);
    }),
  ]);
  if (timer !== undefined) clearTimeout(timer);
  if (typeof outcome === "symbol") {
    await reader.cancel("test cleanup");
    throw new Error("raw response read remained pending after request abort");
  }
  assertEquals(outcome.kind, "rejected");
  if (outcome.kind === "rejected") assertEquals(outcome.error, reason);
  await Promise.resolve();
  assertEquals(sourceCancellationReason, reason);
});

Deno.test("RestClient rejects promptly when response-body cancellation never settles", async () => {
  const pullReached = deferred<void>();
  const pullBlocked = deferred<never>();
  let sourceCancellationReason: unknown;
  const responseBody = new ReadableStream<Uint8Array>({
    pull() {
      pullReached.resolve();
      return pullBlocked.promise;
    },
    cancel(reason) {
      sourceCancellationReason = reason;
      return new Promise<void>(() => {});
    },
  }, { highWaterMark: 0 });
  const parseOperation: RestOperation = {
    id: "fixtures/never-settling-cancel",
    method: "GET",
    path: "/never-settling-cancel",
    responses: [{
      status: 200,
      mediaTypes: ["text/plain"],
      decoders: { "text/plain": "text" },
    }],
  };
  const client = new RestClient({
    baseUrl: "https://example.test",
    fetch: () =>
      Promise.resolve(
        new Response(responseBody, { headers: { "content-type": "text/plain" } }),
      ),
  });
  const controller = new AbortController();
  const pending = client.request(parseOperation, {}, { signal: controller.signal });
  await pullReached.promise;

  const reason = new DOMException("never-settling body cancel", "AbortError");
  controller.abort(reason);
  const deadline = Symbol("deadline");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const outcome = await Promise.race([
    captureRejection(pending),
    new Promise<symbol>((resolve) => {
      timer = setTimeout(() => resolve(deadline), 250);
    }),
  ]);
  if (timer !== undefined) clearTimeout(timer);

  assert(outcome !== deadline, "request waited for response-body cancellation to settle");
  assertEquals(outcome, reason);
  assertEquals(sourceCancellationReason, reason);
});

Deno.test("RestClient cancels original and late replacement bodies after hook abort", async () => {
  const responseOperation: RestOperation = {
    id: "fixtures/response-hook-abort",
    method: "GET",
    path: "/response-hook-abort",
    responses: [{
      status: 200,
      mediaTypes: ["text/plain"],
      decoders: { "text/plain": "text" },
    }],
  };

  for (const replacementKind of ["distinct", "same"] as const) {
    const hookReached = deferred<void>();
    const hookResult = deferred<Response>();
    const originalCancellationReasons: unknown[] = [];
    const replacementCancellationReasons: unknown[] = [];
    const originalResponse = new Response(
      new ReadableStream<Uint8Array>({
        cancel(reason) {
          originalCancellationReasons.push(reason);
        },
      }, { highWaterMark: 0 }),
      { headers: { "content-type": "text/plain" } },
    );
    const replacementResponse = new Response(
      new ReadableStream<Uint8Array>({
        cancel(reason) {
          replacementCancellationReasons.push(reason);
        },
      }, { highWaterMark: 0 }),
      { headers: { "content-type": "text/plain" } },
    );
    const client = new RestClient({
      baseUrl: "https://example.test",
      fetch: () => Promise.resolve(originalResponse),
      afterResponse: () => {
        hookReached.resolve();
        return hookResult.promise;
      },
    });
    const controller = new AbortController();
    const pending = client.request(responseOperation, {}, { signal: controller.signal });
    await hookReached.promise;

    const reason = new DOMException(`${replacementKind} response hook`, "AbortError");
    controller.abort(reason);
    assertEquals(await captureRejection(pending), reason);
    assertEquals(originalCancellationReasons.length, 1);
    assertEquals(originalCancellationReasons[0], reason);

    hookResult.resolve(replacementKind === "distinct" ? replacementResponse : originalResponse);
    await Promise.resolve();
    await Promise.resolve();
    assertEquals(originalCancellationReasons.length, 1);
    assertEquals(replacementCancellationReasons.length, replacementKind === "distinct" ? 1 : 0);
    if (replacementKind === "distinct") {
      assertEquals(replacementCancellationReasons[0], reason);
    }
  }
});

Deno.test("RestClient owns discarded response bodies on hook replacement and rejection", async () => {
  const responseOperation: RestOperation = {
    id: "fixtures/response-hook-ownership",
    method: "GET",
    path: "/response-hook-ownership",
    responses: [
      {
        status: 200,
        mediaTypes: ["text/plain"],
        decoders: { "text/plain": "text" },
      },
      { status: 204, mediaTypes: [] },
    ],
  };

  for (const mode of ["generated", "raw"] as const) {
    for (const outcome of ["distinct", "same", "rejection"] as const) {
      const cancellationReasons: unknown[] = [];
      const originalResponse = new Response(
        new ReadableStream<Uint8Array>({
          pull(controller) {
            controller.enqueue(new TextEncoder().encode("done"));
            controller.close();
          },
          cancel(reason) {
            cancellationReasons.push(reason);
          },
        }, { highWaterMark: 0 }),
        { headers: { "content-type": "text/plain" } },
      );
      const hookError = new Error(`${mode} afterResponse rejection`);
      const client = new RestClient({
        baseUrl: "https://example.test",
        fetch: () => Promise.resolve(originalResponse),
        afterResponse: (response) => {
          if (outcome === "same") return response;
          if (outcome === "rejection") throw hookError;
          return new Response(null, { status: 204 });
        },
      });
      const pending = mode === "generated"
        ? client.request(responseOperation)
        : client.fetch("/response-hook-ownership");

      if (outcome === "rejection") {
        assertEquals(await captureRejection(pending), hookError);
        assertEquals(cancellationReasons.length, 1);
        assertEquals(cancellationReasons[0], hookError);
      } else {
        await pending;
        assertEquals(cancellationReasons.length, outcome === "distinct" ? 1 : 0);
        if (outcome === "distinct") {
          const reason = cancellationReasons[0];
          assert(reason instanceof Error, `${mode} replacement cancellation lacked Error reason`);
          assertEquals(
            reason.message,
            "Response body discarded after afterResponse returned a replacement",
          );
        }
      }
    }
  }
});

Deno.test("RestClient cancels a Fetch response that fulfills after abort", async () => {
  const fetchOperation: RestOperation = {
    id: "fixtures/late-fetch",
    method: "GET",
    path: "/late-fetch",
    responses: [{ status: 200, mediaTypes: [] }],
  };

  for (const mode of ["generated", "raw"] as const) {
    const fetchReached = deferred<void>();
    const fetchResult = deferred<Response>();
    const cancellationReasons: unknown[] = [];
    const client = new RestClient({
      baseUrl: "https://example.test",
      fetch: () => {
        fetchReached.resolve();
        return fetchResult.promise;
      },
    });
    const controller = new AbortController();
    const pending = mode === "generated"
      ? client.request(fetchOperation, {}, { signal: controller.signal })
      : client.fetch("/late-fetch", { signal: controller.signal });
    await fetchReached.promise;

    const reason = new DOMException(`${mode} late Fetch`, "AbortError");
    controller.abort(reason);
    assertEquals(await captureRejection(pending), reason);

    fetchResult.resolve(
      new Response(
        new ReadableStream<Uint8Array>({
          cancel(cancelReason) {
            cancellationReasons.push(cancelReason);
          },
        }, { highWaterMark: 0 }),
      ),
    );
    await Promise.resolve();
    await Promise.resolve();
    assertEquals(cancellationReasons.length, 1);
    assertEquals(cancellationReasons[0], reason);
  }
});

Deno.test("RestClient owns final request bodies across Fetch cancellation and rejection", async () => {
  const fetchOperation: RestOperation = {
    id: "fixtures/fetch-request-ownership",
    method: "GET",
    path: "/fetch-request-ownership",
    responses: [{ status: 204, mediaTypes: [] }],
  };

  for (const mode of ["generated", "raw"] as const) {
    for (const outcome of ["pre-aborted", "pending-abort", "rejection"] as const) {
      const cancellationReasons: unknown[] = [];
      const finalBody = new ReadableStream<Uint8Array>({
        cancel(reason) {
          cancellationReasons.push(reason);
        },
      }, { highWaterMark: 0 });
      const preAbortController = new AbortController();
      const preAbortReason = new DOMException(`${mode} pre-aborted Fetch`, "AbortError");
      if (outcome === "pre-aborted") preAbortController.abort(preAbortReason);
      const fetchReached = deferred<void>();
      const fetchResult = deferred<Response>();
      const fetchCause = new TypeError(`${mode} Fetch rejected`);
      let fetchCalls = 0;
      const client = new RestClient({
        baseUrl: "https://example.test",
        beforeRequest: (request) =>
          new Request(request.url, {
            body: finalBody,
            method: "POST",
            signal: outcome === "pre-aborted" ? preAbortController.signal : undefined,
          }),
        fetch: () => {
          fetchCalls += 1;
          if (outcome === "pending-abort") {
            fetchReached.resolve();
            return fetchResult.promise;
          }
          if (outcome === "rejection") return Promise.reject(fetchCause);
          return Promise.resolve(new Response(null, { status: 204 }));
        },
      });
      const callerController = new AbortController();
      const pending = mode === "generated"
        ? client.request(fetchOperation, {}, {
          signal: outcome === "pending-abort" ? callerController.signal : undefined,
        })
        : client.fetch("/fetch-request-ownership", {
          signal: outcome === "pending-abort" ? callerController.signal : undefined,
        });

      let expectedCancellationReason: unknown;
      if (outcome === "pre-aborted") {
        expectedCancellationReason = preAbortReason;
        assertEquals(await captureRejection(pending), preAbortReason);
        assertEquals(fetchCalls, 0);
      } else if (outcome === "pending-abort") {
        await fetchReached.promise;
        const abortReason = new DOMException(`${mode} pending Fetch`, "AbortError");
        expectedCancellationReason = abortReason;
        callerController.abort(abortReason);
        assertEquals(await captureRejection(pending), abortReason);
        fetchResult.resolve(new Response(null, { status: 204 }));
        await Promise.resolve();
        await Promise.resolve();
        assertEquals(fetchCalls, 1);
      } else {
        expectedCancellationReason = fetchCause;
        const error = await captureRejection(pending);
        assert(error instanceof RestTransportError, `${mode} Fetch rejection lacked context`);
        assertEquals(error.cause, fetchCause);
        assertEquals(fetchCalls, 1);
      }
      assertEquals(cancellationReasons.length, 1);
      assertEquals(cancellationReasons[0], expectedCancellationReason);
    }
  }
});

Deno.test("RestClient raw fetch uses immutable base, headers, and global query defaults", async () => {
  const headers = { authorization: "Bearer original" };
  const query = { api_version: "1", labels: ["bug", "docs"] };
  let captured: Request | undefined;
  const client = new RestClient({
    baseUrl: "https://example.test/api/v1",
    headers,
    query,
    fetch: (input) => {
      captured = input instanceof Request ? input : new Request(input);
      return Promise.resolve(new Response(null, { status: 204 }));
    },
  });

  headers.authorization = "Bearer mutated";
  query.api_version = "2";
  query.labels.push("mutated");
  client.baseUrl.pathname = "/mutated";

  await client.fetch("/health?verbose=true");

  assert(captured !== undefined, "fetch did not receive a request");
  assertEquals(
    captured.url,
    "https://example.test/api/v1/health?verbose=true&api_version=1&labels=bug&labels=docs",
  );
  assertEquals(captured.headers.get("authorization"), "Bearer original");
  assertEquals(client.baseUrl.pathname, "/api/v1");
});

Deno.test("RestClient distinguishes decode failures from HTTP and cancellation failures", async () => {
  const parseOperation: RestOperation = {
    id: "fixtures/parse-error",
    method: "GET",
    path: "/parse-error",
    responses: [{
      status: 500,
      mediaTypes: ["application/json"],
      decoders: { "application/json": "json" },
    }],
  };
  const client = new RestClient({
    baseUrl: "https://example.test",
    fetch: () =>
      Promise.resolve(
        new Response("not json", {
          status: 500,
          headers: { "content-type": "application/json" },
        }),
      ),
  });

  const error = await captureRejection(client.request(parseOperation, {}, { throwOnError: true }));
  assert(error instanceof RestParseError, "invalid response did not produce RestParseError");
  assertEquals(error.operation, parseOperation);
  assertEquals(error.response.status, 500);
  assertEquals(error.mediaType, "application/json");
  assertEquals(error.decodeAs, "json");
  assert(error.cause instanceof SyntaxError, "RestParseError did not retain parser cause");

  const emptyJsonClient = new RestClient({
    baseUrl: "https://example.test",
    fetch: () =>
      Promise.resolve(
        new Response(null, { headers: { "content-type": "application/json" } }),
      ),
  });
  const emptyJsonError = await captureRejection(emptyJsonClient.request(parseOperation));
  assert(emptyJsonError instanceof RestParseError, "empty JSON did not produce RestParseError");
  assert(emptyJsonError.cause instanceof SyntaxError, "empty JSON did not retain syntax cause");

  const transportCause = new TypeError("connection refused");
  const transportClient = new RestClient({
    baseUrl: "https://example.test",
    fetch: () => Promise.reject(transportCause),
  });
  const transportError = await captureRejection(transportClient.request(parseOperation));
  assert(transportError instanceof RestTransportError, "Fetch failure lacked transport context");
  assertEquals(transportError.operation, parseOperation);
  assertEquals(transportError.request.url, "https://example.test/parse-error");
  assertEquals(transportError.cause, transportCause);
});

Deno.test("documented-success helpers preserve generated body types", async () => {
  type TypedResponse =
    | RestResponse<200, { id: number }, "application/json", true>
    | RestResponse<404, { message: string }, "application/json", false>
    | RestUndocumentedResponse;
  const typedOperation: RestOperation = {
    id: "fixtures/typed-success",
    method: "GET",
    path: "/typed-success",
    responses: [{
      status: 200,
      mediaTypes: ["application/json"],
      decoders: { "application/json": "json" },
    }],
  };
  const client = new RestClient({
    baseUrl: "https://example.test",
    fetch: () =>
      Promise.resolve(
        new Response('{"id":42}', { headers: { "content-type": "application/json" } }),
      ),
  });
  const result = await client.request<TypedResponse>(typedOperation);
  const directlyUnwrapped = unwrapRestResponse(result);
  assertType<{ id: number }>(directlyUnwrapped);
  assertEquals(directlyUnwrapped.id, 42);

  if (!isRestDocumentedSuccess(result)) {
    throw new Error("expected documented success");
  }
  assertType<{ id: number }>(result.body);
  const body = unwrapRestResponse(result);
  assertType<{ id: number }>(body);
  assertEquals(body.id, 42);

  const undocumented: RestUndocumentedResponse = {
    documented: false,
    ok: true,
    status: 299,
    mediaType: "application/json",
    body: { id: 1 },
    headerValues: {},
    headers: new Headers(),
    response: new Response(),
    operation: typedOperation,
  };
  const error = captureThrow(() => unwrapRestResponse(undocumented));
  assert(
    error instanceof RestUndocumentedResponseError,
    "undocumented success did not produce RestUndocumentedResponseError",
  );

  const generatedOptions: RestGeneratedRequestOptions = { cache: "no-store" };
  void generatedOptions;
  // @ts-expect-error Generated methods must not expose response parse overrides.
  const unsafeGeneratedOptions: RestGeneratedRequestOptions = { parseAs: "text" };
  void unsafeGeneratedOptions;

  const generatedBinary: RestBinary = new Uint8Array([1]);
  void generatedBinary;
  // @ts-expect-error Generated binary bodies must be replayable and FormData-compatible.
  const generatedStream: RestBinary = new ReadableStream<Uint8Array>();
  void generatedStream;
  const rawStreamOptions: RestRequestOptions = {
    body: new ReadableStream<Uint8Array>(),
  };
  void rawStreamOptions;

  const exactNumber: RestJsonNumber = 9_007_199_254_740_993n;
  void exactNumber;

  const schemaLessJson: RestJsonValue<unknown> = {
    exact: 9_007_199_254_740_993n,
    nested: [{ optional: undefined, value: true }],
  };
  assertType<RestJsonData>(schemaLessJson);
  // @ts-expect-error Schema-less JSON must reject top-level undefined.
  const undefinedSchemaLessJson: RestJsonValue<unknown> = undefined;
  void undefinedSchemaLessJson;
  // @ts-expect-error Schema-less JSON must reject nested functions.
  const functionSchemaLessJson: RestJsonValue<unknown> = { invalid: () => undefined };
  void functionSchemaLessJson;
  // @ts-expect-error Schema-less JSON must reject nested symbols.
  const symbolSchemaLessJson: RestJsonValue<unknown> = { invalid: Symbol("invalid") };
  void symbolSchemaLessJson;

  type JsonFixture = RestJsonValue<{
    file: RestBinary;
    files: readonly RestBinary[];
    id: RestInt64;
    literal: "fixture";
    optional?: Blob | null;
  }>;
  const jsonFixture: JsonFixture = {
    file: "encoded",
    files: ["first", "second"],
    id: 9223372036854775807n,
    literal: "fixture",
    optional: null,
  };
  assertType<string>(jsonFixture.file);
  assertType<RestInt64>(jsonFixture.id);
  // @ts-expect-error Binary Web API objects are represented as JSON strings.
  const invalidJsonFixture: JsonFixture = { ...jsonFixture, file: new Blob() };
  void invalidJsonFixture;

  type RequestFixture = RestRequestValue<{
    readonly id: number;
    name: string;
    nested: { readonly createdAt: string; value?: number };
  }>;
  const requestFixture: RequestFixture = { name: "fixture", nested: { value: 1 } };
  void requestFixture;
  // @ts-expect-error OpenAPI read-only fields must not be accepted in request bodies.
  const invalidRequestFixture: RequestFixture = { id: 1, name: "fixture", nested: {} };
  void invalidRequestFixture;

  type OpenJsonFixture = RestJsonValue<
    Record<string, unknown> & { file: RestBinary; required: string }
  >;
  const openJsonFixture: OpenJsonFixture = { file: "encoded", required: "value" };
  assertType<string>(openJsonFixture.file);
  // @ts-expect-error Open JSON objects must retain named required fields.
  const missingOpenJsonField: OpenJsonFixture = { file: "encoded" };
  void missingOpenJsonField;

  type OpenRequestFixture = RestRequestValue<
    Record<string, unknown> & { readonly id: number; name: string }
  >;
  const openRequestFixture: OpenRequestFixture = { name: "fixture", extension: { enabled: true } };
  void openRequestFixture;
  // @ts-expect-error Open request objects must retain named required fields.
  const missingOpenRequestField: OpenRequestFixture = {};
  void missingOpenRequestField;
  // @ts-expect-error Open request objects must reject named read-only fields.
  const invalidOpenRequestField: OpenRequestFixture = { id: 1, name: "fixture" };
  void invalidOpenRequestField;
});

Deno.test("RestClient exposes immutable generated and undocumented response header values", async () => {
  type HeaderResponse = RestResponse<
    200,
    { id: number },
    "application/json",
    true,
    {
      readonly "x-request-id"?: string;
      readonly "x-rate-limit-remaining"?: string;
      readonly "x-absent"?: string;
    }
  >;
  const headerOperation: RestOperation = {
    id: "fixtures/headers",
    method: "GET",
    path: "/headers",
    responses: [{
      status: 200,
      mediaTypes: ["application/json"],
      decoders: { "application/json": "json" },
      headers: ["x-request-id", "x-rate-limit-remaining", "x-absent"],
    }],
  };
  const responses = [
    new Response('{"id":1}', {
      headers: {
        "content-type": "application/json",
        "x-request-id": "request-1",
        "x-rate-limit-remaining": "42",
        "x-undocumented": "hidden",
      },
    }),
    new Response(new Uint8Array([1]), {
      status: 201,
      headers: { "x-undocumented": "visible" },
    }),
  ];
  const client = new RestClient({
    baseUrl: "https://example.test",
    fetch: () => Promise.resolve(responses.shift()!),
  });

  const documented = await client.request<HeaderResponse>(headerOperation);
  assertEquals(documented.headerValues["x-request-id"], "request-1");
  assertEquals(documented.headerValues["x-rate-limit-remaining"], "42");
  assertEquals(documented.headerValues["x-absent"], undefined);
  assertEquals("x-undocumented" in documented.headerValues, false);
  assert(Object.isFrozen(documented.headerValues), "documented header values were mutable");
  assert(
    captureThrow(() => {
      (documented.headerValues as Record<string, string>)["x-request-id"] = "mutated";
    }) instanceof TypeError,
    "documented header values accepted mutation",
  );

  const undocumented = await client.request(headerOperation);
  assert(undocumented.documented === false, "expected undocumented response");
  assertEquals(undocumented.headerValues["x-undocumented"], "visible");
  assert(Object.isFrozen(undocumented.headerValues), "undocumented header values were mutable");
});

Deno.test("deepFreezeRestOperations preserves exact keys and freezes nested metadata", () => {
  const operations = deepFreezeRestOperations(
    {
      fixture: {
        id: "fixtures/frozen",
        method: "GET",
        path: "/frozen/{id}",
        pathParameters: [{ name: "id" }],
        pathGroups: [{ start: 0, end: 1, parameters: ["id"] }],
        queryParameters: [{ name: "labels", style: "form", explode: true }],
        responses: [{
          status: 200,
          mediaTypes: ["application/json"],
          decoders: { "application/json": "json" },
          headers: ["x-request-id"],
        }],
      },
    } as const satisfies Readonly<Record<string, RestOperation>>,
  );

  assertType<RestOperation>(operations.fixture);
  // @ts-expect-error Exact generated operation keys must be preserved.
  void operations.missing;
  assert(Object.isFrozen(operations), "operation registry was mutable");
  assert(Object.isFrozen(operations.fixture), "operation descriptor was mutable");
  assert(Object.isFrozen(operations.fixture.pathParameters), "path metadata was mutable");
  assert(Object.isFrozen(operations.fixture.pathGroups), "path group metadata was mutable");
  assert(Object.isFrozen(operations.fixture.pathGroups?.[0]), "path group was mutable");
  assert(
    Object.isFrozen(operations.fixture.pathGroups?.[0].parameters),
    "path group parameters were mutable",
  );
  assert(Object.isFrozen(operations.fixture.responses), "response metadata was mutable");
  assert(Object.isFrozen(operations.fixture.responses[0]), "response descriptor was mutable");
  assert(
    Object.isFrozen(operations.fixture.responses[0].decoders),
    "decoder metadata was mutable",
  );
  assert(
    captureThrow(() => {
      (operations.fixture as { path: string }).path = "/mutated";
    }) instanceof TypeError,
    "operation descriptor accepted mutation",
  );
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function assertType<T>(_value: T): void {
  // Compile-time assertion only.
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

async function captureRejection(value: Promise<unknown>): Promise<unknown> {
  try {
    await value;
  } catch (error) {
    return error;
  }
  throw new Error("Expected promise to reject");
}

function captureThrow(callback: () => unknown): unknown {
  try {
    callback();
  } catch (error) {
    return error;
  }
  throw new Error("Expected callback to throw");
}
