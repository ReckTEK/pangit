import type { AnyRestResponse } from "../../../../generated-rest-clients/runtime/mod.ts";
import {
  AuthenticationError,
  ConflictError,
  type FluentOperationError,
  NotFoundError,
  OperationAbortedError,
  OperationTimeoutError,
  PermissionDeniedError,
  ProviderInvariantError,
  ProviderOperationError,
  RateLimitError,
  ValidationError,
} from "../../../../fluent-api/adapter-contract/errors.ts";
import { ForgejoAdapterContext } from "../ForgejoAdapterContext.ts";
import {
  decodeForgejoPageCursor,
  encodeForgejoPageCursor,
  forgejoPagination,
  type ForgejoSuccessResponse,
  mapForgejoBounded,
  pollForgejo,
  requestForgejo,
  requestForgejoBody,
  requestOptionalForgejoBody,
  throwForForgejoHttpResponse,
} from "./mod.ts";

const context = new ForgejoAdapterContext("16.0.3", {
  baseUrl: "https://forgejo.example.invalid/api/v1",
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  }
}

function operation(universal: string) {
  return { universal } as const;
}

async function assertRejects(
  execute: () => unknown | Promise<unknown>,
  errorType: new (...args: never[]) => Error,
): Promise<Error> {
  try {
    await execute();
  } catch (error) {
    assert(error instanceof errorType, `Expected ${errorType.name}, received ${String(error)}`);
    return error;
  }
  throw new Error(`Expected ${errorType.name}`);
}

function response(status: number, options: {
  documented?: boolean;
  body?: unknown;
  headers?: HeadersInit;
} = {}): AnyRestResponse {
  const ok = status >= 200 && status < 300;
  const headers = new Headers(options.headers);
  return {
    ok,
    documented: options.documented ?? true,
    status,
    body: options.body,
    headers,
    headerValues: Object.freeze({}),
    mediaType: "application/json",
    response: new Response(null, { status, headers }),
    operation: {
      id: "fixtureOperation",
      method: "GET",
      path: "/fixture",
      responses: [],
    },
  } as unknown as AnyRestResponse;
}

Deno.test("Forgejo response mapper preserves the fluent error taxonomy and safe detail", async () => {
  const cases = [
    [401, AuthenticationError],
    [403, PermissionDeniedError],
    [404, NotFoundError],
    [409, ConflictError],
    [423, ConflictError],
    [400, ValidationError],
    [422, ValidationError],
    [429, RateLimitError],
    [500, ProviderOperationError],
  ] as const;
  for (const [status, errorType] of cases) {
    const error = await assertRejects(
      () =>
        requestForgejo(
          context,
          operation("testResponseMapping"),
          () =>
            Promise.resolve(response(status, {
              headers: {
                "x-request-id": "request-123",
                "retry-after": "7",
              },
            })),
        ),
      errorType,
    ) as FluentOperationError;
    assertEquals(error.provider, "forgejo", "provider detail changed");
    assertEquals(error.version, "16.0.3", "version detail changed");
    assertEquals(error.operation, "testResponseMapping", "operation detail changed");
    assertEquals(error.status, status, "status detail changed");
    assertEquals(error.requestId, "request-123", "request ID detail changed");
    assertEquals(error.retryAfter, "7", "retry metadata changed");
  }
});

Deno.test("Forgejo response mapper records universal and native operation identities separately", () => {
  let rejected: unknown;
  try {
    throwForForgejoHttpResponse(
      context,
      { universal: "authorizeOAuth", native: "oauthAccessToken" },
      new Response(null, {
        status: 403,
        headers: { "x-request-id": "request-456" },
      }),
    );
  } catch (error) {
    rejected = error;
  }
  assert(rejected instanceof PermissionDeniedError, "HTTP error did not retain its taxonomy");
  assertEquals(rejected.provider, "forgejo", "provider detail changed");
  assertEquals(rejected.version, "16.0.3", "version detail changed");
  assertEquals(rejected.operation, "authorizeOAuth", "universal operation identity changed");
  assertEquals(rejected.requestId, "request-456", "request ID detail changed");
  const nativeCause = rejected.cause as AnyRestResponse;
  assertEquals(nativeCause.operation.id, "oauthAccessToken", "native operation identity was lost");
});

Deno.test("Forgejo response mapper rejects undocumented and malformed successes", async () => {
  await assertRejects(
    () =>
      requestForgejo(context, operation("undocumented"), () =>
        Promise.resolve(response(204, {
          documented: false,
        }))),
    ProviderInvariantError,
  );
  await assertRejects(
    () =>
      requestForgejoBody<{ id: string }, "16.0.3">(
        context,
        operation("malformed"),
        () => Promise.resolve(response(200, { body: { id: 3 } })),
        undefined,
        (value): value is { id: string } =>
          typeof value === "object" && value !== null &&
          typeof (value as { id?: unknown }).id === "string",
      ),
    ProviderInvariantError,
  );
});

Deno.test("optional Forgejo reads translate only confirmed 404 responses", async () => {
  const missing = await requestOptionalForgejoBody(
    context,
    operation("findFixture"),
    () => Promise.resolve(response(404)),
  );
  assertEquals(missing, undefined, "404 did not become absence");
  await assertRejects(
    () =>
      requestOptionalForgejoBody(
        context,
        operation("findFixture"),
        () => Promise.resolve(response(403)),
      ),
    PermissionDeniedError,
  );
});

Deno.test("Forgejo response mapper treats GetBlob's observed HTTP 400 as confirmed absence", async () => {
  const error = await assertRejects(
    () =>
      requestForgejo(
        context,
        { universal: "getBlob", native: "GetBlob" },
        () => Promise.resolve(response(400)),
      ),
    NotFoundError,
  ) as FluentOperationError;
  assertEquals(error.operation, "getBlob", "blob absence lost its universal operation");
  assertEquals(error.status, 400, "blob absence lost Forgejo's native status");
});

Deno.test("Forgejo response mapper normalizes preflight and transport cancellation", async () => {
  const preflight = new AbortController();
  preflight.abort(new Error("stop"));
  await assertRejects(
    () =>
      requestForgejo(
        context,
        operation("preflightAbort"),
        () => Promise.resolve(response(200)),
        preflight.signal,
      ),
    OperationAbortedError,
  );
  await assertRejects(
    () =>
      requestForgejo(context, operation("transportAbort"), () => {
        throw new DOMException("aborted", "AbortError");
      }),
    OperationAbortedError,
  );
  await assertRejects(
    () =>
      requestForgejo(context, operation("transportFailure"), () => {
        throw new TypeError("network unavailable");
      }),
    ProviderOperationError,
  );
});

Deno.test("Forgejo cursors round-trip and reject malformed values", () => {
  assertEquals(decodeForgejoPageCursor(), { page: 1 }, "initial cursor changed");
  const encoded = encodeForgejoPageCursor({ page: 3, effectiveLimit: 25 });
  assertEquals(encoded, "forgejo-page:3:25", "cursor encoding changed");
  assertEquals(
    decodeForgejoPageCursor(encoded),
    { page: 3, effectiveLimit: 25 },
    "cursor round trip changed",
  );
  for (const malformed of ["", "forgejo-page:0", "forgejo-page:-1", "forgejo-page:1:0", "page:2"]) {
    let rejected: unknown;
    try {
      decodeForgejoPageCursor(malformed, {
        version: context.version,
        operation: { universal: "listBranches", native: "repoListBranches" },
      });
    } catch (error) {
      rejected = error;
    }
    assert(rejected instanceof ValidationError, `Malformed cursor was accepted: ${malformed}`);
    assertEquals(rejected.provider, "forgejo", "cursor provider detail changed");
    assertEquals(rejected.version, "16.0.3", "cursor version detail changed");
    assertEquals(rejected.operation, "listBranches", "cursor operation identity changed");
  }
});

Deno.test("Forgejo pagination uses provider proof across caps and exact boundaries", () => {
  const capped = forgejoPagination(
    context,
    operation("listFixtures"),
    response(200, {
      headers: { "x-total-count": "13", "x-page": "1", "x-perpage": "5" },
    }) as ForgejoSuccessResponse,
    { page: 1 },
    50,
    5,
  );
  assertEquals(
    capped,
    { nextCursor: "forgejo-page:2:5", totalCount: 13 },
    "server cap pagination changed",
  );
  const exactEnd = forgejoPagination(
    context,
    operation("listFixtures"),
    response(200, {
      headers: { "x-total-count": "10", "x-perpage": "5" },
    }) as ForgejoSuccessResponse,
    { page: 2, effectiveLimit: 5 },
    50,
    5,
  );
  assertEquals(exactEnd, { totalCount: 10 }, "exact end invented an empty page");
  const linked = forgejoPagination(
    context,
    operation("listFixtures"),
    response(200, {
      headers: { link: '</api/v1/fixtures?page=4>; rel="next"' },
    }) as ForgejoSuccessResponse,
    { page: 3 },
    20,
    20,
  );
  assertEquals(linked, { nextCursor: "forgejo-page:4:20" }, "relative Link was ignored");
  const unproven = forgejoPagination(
    context,
    operation("listFixtures"),
    response(200) as ForgejoSuccessResponse,
    { page: 1 },
    20,
    20,
  );
  assertEquals(unproven, {}, "pagination continued without provider proof");
});

Deno.test("Forgejo pagination rejects malformed metadata", () => {
  for (const [name, value] of [["x-total-count", "many"], ["x-hasmore", "sometimes"]]) {
    let rejected = false;
    try {
      forgejoPagination(
        context,
        operation("listFixtures"),
        response(200, { headers: { [name]: value } }) as ForgejoSuccessResponse,
        { page: 1 },
        10,
        1,
      );
    } catch (error) {
      rejected = error instanceof ProviderInvariantError;
    }
    assert(rejected, `Malformed ${name} was accepted`);
  }
});

Deno.test("bounded Forgejo map preserves order and never exceeds its concurrency", async () => {
  let active = 0;
  let maximum = 0;
  const values = [5, 4, 3, 2, 1];
  const output = await mapForgejoBounded(
    context,
    operation("mapFixtures"),
    values,
    2,
    undefined,
    async (value) => {
      active++;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, value));
      active--;
      return value * 2;
    },
  );
  assertEquals(output, [10, 8, 6, 4, 2], "bounded map reordered output");
  assert(maximum <= 2, `bounded map reached concurrency ${maximum}`);
  assert(Object.isFrozen(output), "bounded map output is mutable");
});

Deno.test("bounded Forgejo map observes an already-aborted signal", async () => {
  const controller = new AbortController();
  controller.abort();
  let called = false;
  await assertRejects(
    () =>
      mapForgejoBounded(context, operation("mapFixtures"), [1], 1, controller.signal, () => {
        called = true;
        return Promise.resolve(1);
      }),
    OperationAbortedError,
  );
  assert(!called, "bounded map began work after cancellation");
});

Deno.test("bounded Forgejo map stops queued work and aborts siblings after failure", async () => {
  const failure = new Error("fixture failure");
  const started: number[] = [];
  let siblingAborted = false;
  let caught: unknown;
  try {
    await mapForgejoBounded(
      context,
      operation("mapFixtures"),
      [0, 1, 2, 3],
      2,
      undefined,
      async (value, _index, signal) => {
        started.push(value);
        if (value === 1) throw failure;
        await new Promise<void>((_resolve, reject) => {
          signal.addEventListener("abort", () => {
            siblingAborted = true;
            reject(signal.reason);
          }, { once: true });
        });
        return value;
      },
    );
  } catch (error) {
    caught = error;
  }
  assert(caught === failure, "bounded map replaced the first worker failure");
  assertEquals(started, [0, 1], "bounded map dequeued work after failure");
  assert(siblingAborted, "bounded map did not abort its in-flight sibling");
});

Deno.test("bounded Forgejo helpers normalize local option validation", async () => {
  for (
    const execute of [
      () =>
        mapForgejoBounded(
          context,
          operation("readFiles"),
          [1],
          0,
          undefined,
          (value) => Promise.resolve(value),
        ),
      () =>
        pollForgejo(
          context,
          operation("createFork"),
          { attempts: 0, intervalMs: 0 },
          () => Promise.resolve("ready"),
        ),
      () =>
        pollForgejo(
          context,
          operation("createFork"),
          { attempts: 1, intervalMs: -1 },
          () => Promise.resolve("ready"),
        ),
    ]
  ) {
    const error = await assertRejects(execute, ValidationError) as ValidationError;
    assertEquals(error.provider, "forgejo", "validation provider detail changed");
    assertEquals(error.version, "16.0.3", "validation version detail changed");
    assert(
      error.operation === "readFiles" || error.operation === "createFork",
      `validation operation identity changed: ${error.operation}`,
    );
  }
});

Deno.test("Forgejo polling is bounded, abort-aware, and touches only its supplied reader", async () => {
  const attempts: number[] = [];
  const value = await pollForgejo(
    context,
    operation("pollFixture"),
    { attempts: 3, intervalMs: 0 },
    (attempt) => {
      attempts.push(attempt);
      return Promise.resolve(attempt === 2 ? "ready" : undefined);
    },
  );
  assertEquals(value, "ready", "poll did not return ready value");
  assertEquals(attempts, [1, 2], "poll performed extra work");

  await assertRejects(
    () =>
      pollForgejo(
        context,
        operation("pollFixture"),
        { attempts: 2, intervalMs: 0 },
        () => Promise.resolve(undefined),
      ),
    OperationTimeoutError,
  );

  const controller = new AbortController();
  await assertRejects(
    () =>
      pollForgejo(
        context,
        operation("pollFixture"),
        { attempts: 3, intervalMs: 1_000, signal: controller.signal },
        () => {
          controller.abort();
          return Promise.resolve(undefined);
        },
      ),
    OperationAbortedError,
  );
});
