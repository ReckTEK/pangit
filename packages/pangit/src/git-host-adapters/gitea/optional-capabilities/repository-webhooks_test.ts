import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import { GiteaAdapterContext } from "../GiteaAdapterContext.ts";
import {
  createGiteaRepositoryWebhook,
  deleteGiteaRepositoryWebhook,
  getGiteaRepositoryWebhook,
  listGiteaRepositoryWebhooks,
  updateGiteaRepositoryWebhook,
} from "./repository-webhooks.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  }
}

async function assertRejects(
  execute: () => unknown | Promise<unknown>,
  errorType: new (...args: never[]) => Error,
): Promise<void> {
  try {
    await execute();
  } catch (error) {
    assert(error instanceof errorType, `Expected ${errorType.name}, received ${String(error)}`);
    return;
  }
  throw new Error(`Expected ${errorType.name}`);
}

const repository = {
  id: "1",
  owner: "acme",
  name: "demo",
  fullName: "acme/demo",
  native: {},
} as unknown as RepositoryData<"gitea", "1.27.2">;

function hook(active = true) {
  return {
    id: 9,
    active,
    name: "build journal",
    type: "gitea",
    events: ["push", "pull_request", "deployment"],
    config: { url: "https://sink.example.invalid/hook", content_type: "json" },
    created_at: "2026-01-01T00:00:00Z",
  };
}

Deno.test("Gitea repository webhooks use one direct request per lifecycle operation", async () => {
  const requests: Request[] = [];
  const context = new GiteaAdapterContext("1.27.2", {
    baseUrl: "https://gitea.example.invalid/api/v1",
    fetch: (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname.endsWith("/hooks")) {
        return Promise.resolve(Response.json([hook()], {
          headers: { "x-total-count": "3", "x-perpage": "1", "x-page": "1" },
        }));
      }
      if (request.method === "GET") return Promise.resolve(Response.json(hook()));
      if (request.method === "POST") {
        return Promise.resolve(Response.json(hook(), { status: 201 }));
      }
      if (request.method === "PATCH") return Promise.resolve(Response.json(hook(false)));
      if (request.method === "DELETE") return Promise.resolve(new Response(null, { status: 204 }));
      return Promise.resolve(new Response(null, { status: 500 }));
    },
  });

  const page = await listGiteaRepositoryWebhooks(context, repository, { limit: 2 });
  const fetched = await getGiteaRepositoryWebhook(context, repository, "9");
  const created = await createGiteaRepositoryWebhook(context, repository, {
    url: "https://sink.example.invalid/hook",
    events: ["push", "pull-request"],
    secret: "not-retained",
  });
  const updated = await updateGiteaRepositoryWebhook(context, repository, created, {
    active: false,
    contentType: "form",
  });
  await deleteGiteaRepositoryWebhook(context, repository, updated);

  assertEquals(requests.length, 5, "webhook lifecycle request count changed");
  assertEquals(page.nextCursor, "gitea-page:2:1", "webhook page cursor changed");
  assertEquals(page.items[0].events, ["push", "pull-request"], "webhook events changed");
  assertEquals(
    page.items[0].providerEvents,
    ["push", "pull_request", "deployment"],
    "provider events were not retained",
  );
  assertEquals(fetched.id, "9", "direct webhook identity changed");
  assertEquals(updated.active, false, "webhook update normalization changed");
  assert(!("secret" in created), "webhook secret leaked into the normalized entity");
  const nativeId = await created.native.gitea(({ repositoryWebhook }) => repositoryWebhook.id);
  assertEquals(nativeId, 9, "webhook native payload changed");

  const createBody = await requests[2].clone().json();
  assertEquals(createBody.events, ["push", "pull_request"], "Gitea event mapping changed");
  assertEquals(createBody.config.secret, "not-retained", "webhook secret was not sent");
  const updateBody = await requests[3].clone().json();
  assertEquals(
    updateBody.config,
    { url: "https://sink.example.invalid/hook", content_type: "form" },
    "webhook update did not retain known config",
  );
});

Deno.test("Gitea repository webhook validation rejects locally before HTTP", async () => {
  let requests = 0;
  const context = new GiteaAdapterContext("1.27.2", {
    baseUrl: "https://gitea.example.invalid/api/v1",
    fetch: () => {
      requests++;
      return Promise.resolve(Response.json(hook()));
    },
  });
  await assertRejects(
    () =>
      createGiteaRepositoryWebhook(context, repository, {
        url: "file:///tmp/hook",
        events: ["push"],
      }),
    TypeError,
  );
  await assertRejects(
    () =>
      createGiteaRepositoryWebhook(context, repository, {
        url: "https://sink.invalid",
        events: [],
      }),
    RangeError,
  );
  await assertRejects(() => getGiteaRepositoryWebhook(context, repository, "all"), TypeError);
  assertEquals(requests, 0, "invalid webhook input reached Gitea");
});
