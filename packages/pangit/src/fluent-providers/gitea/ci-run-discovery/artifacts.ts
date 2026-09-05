import type { GiteaProviderTypes } from "../provider-types.ts";
import type { CiArtifactData } from "../../../fluent-api/adapter-contract/optional/ci-run-discovery.ts";

import {
  type OperationOptions,
  requireIdentity,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import {
  createGiteaCiEntityNative,
  type GiteaCiEntityPayload,
} from "../native/GiteaCiRunDiscoveryNative.ts";
import type { GiteaClient, GiteaVersion } from "../native/GiteaEntityNative.ts";
import { requestGitea, requestGiteaBody } from "../transport/response/mod.ts";
import {
  type AnyArtifact,
  invariant,
  isArtifactPayload,
  parseGiteaId,
  requireArtifactList,
  safeInteger,
} from "./validate-payload.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

/** Find a named artifact for one known run without scanning other runs or artifacts. */
export async function findGiteaCiRunArtifact<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  runId: string,
  name: string,
  options: OperationOptions = {},
): Promise<CiArtifactData<"gitea", TVersion, GiteaProviderTypes> | undefined> {
  const operation = { universal: "findCiRunArtifact", native: "getArtifactsOfRun" } as const;
  const artifactName = requireIdentity(name, "artifact name");
  const id = parseGiteaId(runId, "workflow run id");
  const client = await context.client();
  const response = await requestGitea(
    context,
    operation,
    () =>
      client.getArtifactsOfRun(
        {
          path: {
            ...repositoryPath(repository),
            run: id,
          },
          query: { name: artifactName },
        },
        requestOptions(options.signal),
      ),
    options.signal,
  );
  const wrapper = requireArtifactList(context, operation.universal, response.body);
  const exact = wrapper.items.filter((artifact) => artifact.name === artifactName);
  if (exact.length > 1) {
    throw invariant(context, operation.universal, "returned duplicate exact artifact names");
  }
  return exact[0] === undefined ? undefined : normalizeGiteaCiArtifact(client, exact[0]);
}

/** Directly read one artifact by exact ID. */
export async function getGiteaCiArtifact<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  artifactId: string,
  options: OperationOptions = {},
): Promise<CiArtifactData<"gitea", TVersion, GiteaProviderTypes>> {
  const operation = { universal: "getCiArtifact", native: "getArtifact" } as const;
  const id = requireIdentity(artifactId, "artifact id");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyArtifact, TVersion>(
    context,
    operation,
    () =>
      client.getArtifact(
        {
          path: {
            ...repositoryPath(repository),
            artifact_id: id,
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isArtifactPayload,
  );
  return normalizeGiteaCiArtifact(client, payload);
}

export function normalizeGiteaCiArtifact<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  payload: GiteaCiEntityPayload<TVersion, "artifact">,
): CiArtifactData<"gitea", TVersion, GiteaProviderTypes> {
  if (!isArtifactPayload(payload)) throw new TypeError("malformed Gitea artifact payload");
  return Object.freeze({
    id: String(payload.id),
    ...(payload.workflow_run?.id === undefined ? {} : { runId: String(payload.workflow_run.id) }),
    ...(payload.name === undefined ? {} : { name: payload.name }),
    ...(payload.size_in_bytes === undefined
      ? {}
      : { size: safeInteger(payload.size_in_bytes, true) }),
    ...(payload.expired === undefined ? {} : { expired: payload.expired }),
    ...(payload.created_at === undefined ? {} : { createdAt: payload.created_at }),
    ...(payload.expires_at === undefined ? {} : { expiresAt: payload.expires_at }),
    ...(payload.url === undefined ? {} : { url: payload.url }),
    native: createGiteaCiEntityNative("artifact", client, payload),
  });
}
