import { FluentApiRequestRecorder, proveRequestSequence } from "./request-recorder.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const operation = (id: string) =>
  ({
    id,
    method: "GET",
    path: "/fixture",
    pathParameters: [],
    pathGroups: [],
    queryParameters: [],
    headers: [],
    security: [],
    responses: [],
  }) as const;

Deno.test("request recorder scopes exact operation IDs without retaining secrets", async () => {
  const recorder = new FluentApiRequestRecorder();
  await recorder.beforeRequest(
    new Request("https://example.invalid/outside?token=secret"),
    operation("outside"),
    { url: "https://example.invalid/outside" },
  );

  const capture = await recorder.capture(async () => {
    await recorder.beforeRequest(
      new Request("https://example.invalid/repos/acme/site?token=secret", {
        headers: { authorization: "token secret" },
      }),
      operation("repoGet"),
      { url: "https://example.invalid/repos/acme/site" },
    );
    return 42;
  });
  const proof = proveRequestSequence("getRepository", ["repoGet"], capture);
  assert(proof.value === 42, "Captured operation result was lost");
  assert(proof.evidence.requests.length === 1, "Capture included requests outside its scope");
  assert(
    proof.evidence.requests[0].path === "/repos/acme/site",
    "Recorder retained a query value or changed the path",
  );
  assert(
    !JSON.stringify(proof.evidence).includes("secret"),
    "Request evidence retained credentials or query values",
  );
});

Deno.test("request recorder rejects nested scopes and mismatched request budgets", async () => {
  const recorder = new FluentApiRequestRecorder();
  let nestedRejected = false;
  await recorder.capture(async () => {
    try {
      await recorder.capture(() => Promise.resolve(undefined));
    } catch (error) {
      nestedRejected = error instanceof Error && error.message.includes("cannot be nested");
    }
  });
  assert(nestedRejected, "Nested request capture was accepted");

  const capture = await recorder.capture(async () => {
    await recorder.beforeRequest(
      new Request("https://example.invalid/repos/acme/site"),
      operation("repoGet"),
      { url: "https://example.invalid/repos/acme/site" },
    );
  });
  let mismatchRejected = false;
  try {
    proveRequestSequence("deleteRepository", ["repoDelete"], capture);
  } catch (error) {
    mismatchRejected = error instanceof Error && error.message.includes("repoGet");
  }
  assert(mismatchRejected, "Mismatched request sequence was accepted");
});
