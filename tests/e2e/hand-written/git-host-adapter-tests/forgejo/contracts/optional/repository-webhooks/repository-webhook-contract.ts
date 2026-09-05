import {
  createClient,
  errors,
  type ProviderVersion,
} from "../../../../../../../../packages/pangit/src/fluent-client/mod.ts";
import type {
  FluentApiContractResult,
  FluentApiRequestEvidence,
} from "../../../../../fluent-api-contracts/contract-result.ts";
import {
  FluentApiRequestRecorder,
  proveRequestSequence,
} from "../../../../../fluent-api-contracts/request-recorder.ts";
import type { RepositoryWebhookContractFixtures } from "../../../../../fluent-api-contracts/optional/repository-webhooks/repository-webhook-contract-fixtures.ts";

export type RepositoryWebhookContractInput<
  TProvider extends "forgejo",
  TVersion extends ProviderVersion<TProvider>,
> = {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly apiUrl: string;
  readonly token: string;
  readonly fixtures: RepositoryWebhookContractFixtures;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function record(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : undefined;
}

/** Exercise webhook CRUD and prove a real push reaches the isolated journal receiver. */
export async function runRepositoryWebhookContract<
  const TProvider extends "forgejo",
  const TVersion extends ProviderVersion<TProvider>,
>(
  t: Deno.TestContext,
  input: RepositoryWebhookContractInput<TProvider, TVersion>,
): Promise<FluentApiContractResult> {
  const assertions: string[] = [];
  const requestEvidence: FluentApiRequestEvidence[] = [];
  const recorder = new FluentApiRequestRecorder();
  const prove = async <TValue>(
    operation: string,
    expected: readonly string[],
    action: () => Promise<TValue>,
  ): Promise<TValue> => {
    const proof = proveRequestSequence(operation, expected, await recorder.capture(action));
    requestEvidence.push(proof.evidence);
    return proof.value;
  };

  const passed = await t.step("shared-capability/repository-webhooks", async () => {
    const git = await (await createClient(input.provider, input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    })).auth.token(input.token);
    const repository = await (await git.container(input.fixtures.repository.owner)).repository(
      input.fixtures.repository.name,
    );
    const webhooks = repository.webhooks;

    const support = await prove(
      "repository.webhooks.support",
      [],
      () => Promise.resolve(webhooks.support),
    );
    assert(support.supported, "Repository webhooks are not advertised as supported");
    assert(support.operations.list === "one-page", "Webhook listing is not one-page bounded");
    assert(support.operations.get === "direct", "Webhook lookup is not direct");
    assert(support.testDelivery === "native-only", "Webhook test delivery leaked into shared API");
    assertions.push("webhook support metadata is static, bounded, and request-free");

    await input.fixtures.receiver.clear();
    const created = await prove(
      "repository.webhooks.create",
      ["repoCreateHook"],
      () =>
        webhooks.create({
          url: input.fixtures.receiver.targetUrl,
          events: ["push"],
          active: true,
          contentType: "json",
        }),
    );
    assert(created.id.trim().length > 0, "Created webhook has no identity");
    assert(created.url === new URL(input.fixtures.receiver.targetUrl).href, "Webhook URL changed");
    assert(created.events.includes("push"), "Created webhook omitted its push event");
    assert(Object.isFrozen(created), "Webhook entity is mutable");
    assert(Object.isFrozen(created.events), "Webhook events are mutable");

    const direct = await prove(
      "repository.webhooks.get",
      ["repoGetHook"],
      () => webhooks.get(created.id),
    );
    assert(direct.id === created.id, "Direct webhook lookup returned the wrong hook");

    const page = await prove(
      "repository.webhooks.list",
      ["repoListHooks"],
      () => webhooks.list({ limit: 4 }),
    );
    assert(page.items.length <= 4, "Webhook page exceeded its requested limit");
    assert(
      page.items.some((webhook) => webhook.id === created.id),
      "Webhook page omitted known hook",
    );

    const updated = await prove(
      "repository.webhooks.update",
      ["repoEditHook"],
      () => webhooks.update(created, { events: ["push", "issue"], active: true }),
    );
    assert(updated.active, "Updated webhook is inactive");
    assert(updated.events.includes("push"), "Webhook update removed push delivery");
    assert(updated.events.includes("issue"), "Webhook update did not retain the added event");

    const nativeId = await prove(
      "repositoryWebhook.native.forgejo",
      [],
      () => updated.native.forgejo(({ repositoryWebhook }) => repositoryWebhook.id),
    );
    assert(String(nativeId) === updated.id, "Webhook native payload was not retained");
    assertions.push("create, get, bounded list, and update have exact one-request budgets");

    const commit = await prove(
      "repository.webhooks.trigger.push",
      ["repoChangeFiles"],
      () =>
        repository.content.commitChanges({
          branch: input.fixtures.branch,
          message: "PanGit webhook delivery fixture",
          changes: [{
            operation: "create",
            path: "webhook-contract-push.txt",
            content: "trigger one push delivery\n",
          }],
        }).execute(),
    );
    assert(commit.sha.trim().length > 0, "Webhook trigger commit has no SHA");

    const delivery = await input.fixtures.receiver.waitForEvent("push", 10_000);
    assert(delivery.event === "push", "Webhook receiver returned the wrong event");
    const body = record(delivery.body);
    const deliveredRepository = record(body?.repository);
    assert(body !== undefined, "Webhook receiver returned a non-object payload");
    assert(
      deliveredRepository?.full_name ===
        `${input.fixtures.repository.owner}/${input.fixtures.repository.name}`,
      "Webhook delivery came from the wrong repository",
    );
    assert(
      body.ref === `refs/heads/${input.fixtures.branch}`,
      "Webhook delivery came from the wrong branch",
    );
    assertions.push("one fluent commit triggers one bounded, repository-specific push delivery");

    let invalid = false;
    const invalidCapture = await recorder.capture(async () => {
      try {
        await webhooks.create({ url: "not a valid URL", events: ["push"] });
      } catch (error) {
        invalid = error instanceof errors.ValidationError &&
          error.operation === "createRepositoryWebhook";
      }
    });
    requestEvidence.push(
      proveRequestSequence("repository.webhooks.create.invalidUrl", [], invalidCapture).evidence,
    );
    assert(
      invalid,
      "Malformed webhook URL was not rejected locally as createRepositoryWebhook ValidationError",
    );

    const controller = new AbortController();
    controller.abort();
    let aborted = false;
    const abortCapture = await recorder.capture(async () => {
      try {
        await webhooks.get(created.id, { signal: controller.signal });
      } catch (error) {
        aborted = error instanceof errors.OperationAbortedError;
      }
    });
    requestEvidence.push(
      proveRequestSequence("repository.webhooks.get.preflightAbort", [], abortCapture).evidence,
    );
    assert(aborted, "Webhook cancellation was not normalized");

    await prove(
      "repository.webhooks.delete",
      ["repoDeleteHook"],
      () => webhooks.delete(updated),
    );
    let missing = false;
    const missingCapture = await recorder.capture(async () => {
      try {
        await webhooks.get(created.id);
      } catch (error) {
        missing = error instanceof errors.NotFoundError;
      }
    });
    requestEvidence.push(
      proveRequestSequence(
        "repository.webhooks.get.afterDelete",
        ["repoGetHook"],
        missingCapture,
      ).evidence,
    );
    assert(missing, "Deleted webhook was not reported missing");
    assertions.push("invalid and cancelled calls cost zero; delete and absence are each direct");
  });

  return Object.freeze({
    id: "shared-capability/repository-webhooks",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
