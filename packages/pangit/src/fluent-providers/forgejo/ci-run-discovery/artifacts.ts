import type { CiArtifactData } from "../../../fluent-api/adapter-contract/optional/ci-run-discovery.ts";
import {
  type OperationOptions,
  requireIdentity,
} from "../../../fluent-api/adapter-contract/operation-options.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import { OperationTimeoutError } from "../../../fluent-api/adapter-contract/errors.ts";
import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoClient, ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import {
  createForgejoCiEntityNative,
  type ForgejoCiEntityPayload,
} from "../native/ForgejoCiRunDiscoveryNative.ts";
import { requestForgejoBody } from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";
import { requireJobArtifactClient } from "./support.ts";
import {
  type AnyArtifact,
  isArtifactPayload,
  parseForgejoId,
  safeInteger,
} from "./validate-payload.ts";

export async function findForgejoCiRunArtifact<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
  repository: RepositoryData<"forgejo", V>,
  runId: string,
  name: string,
  options: OperationOptions = {},
): Promise<CiArtifactData<"forgejo", V> | undefined> {
  const client = await requireJobArtifactClient(context, "findCiRunArtifact");
  const artifactName = requireIdentity(name, "artifact name");
  const artifacts = await requestForgejoBody<readonly AnyArtifact[], V>(
    context,
    { universal: "findCiRunArtifact", native: "ListActionRunArtifacts" },
    () =>
      client.listActionRunArtifacts({
        path: { ...repositoryPath(repository), run_id: parseForgejoId(runId, "run id") },
      }, requestOptions(options.signal)),
    options.signal,
    (value): value is readonly AnyArtifact[] =>
      Array.isArray(value) && value.every(isArtifactPayload),
  );
  if (artifacts.length > 1000) {
    throw new OperationTimeoutError("Artifact discovery exceeds 1000 artifacts", {
      provider: "forgejo",
      version: context.version,
      operation: "findCiRunArtifact",
    });
  }
  const matches = artifacts.filter((artifact) => artifact.name === artifactName);
  if (matches.length > 1) throw new TypeError("Artifact name is ambiguous within this run");
  return matches[0] === undefined
    ? undefined
    : normalizeForgejoCiArtifact(await context.client(), matches[0]);
}

export async function getForgejoCiArtifact<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
  repository: RepositoryData<"forgejo", V>,
  artifactId: string,
  options: OperationOptions = {},
): Promise<CiArtifactData<"forgejo", V>> {
  const client = await requireJobArtifactClient(context, "getCiArtifact");
  const payload = await requestForgejoBody<AnyArtifact, V>(
    context,
    { universal: "getCiArtifact", native: "GetActionArtifact" },
    () =>
      client.getActionArtifact({
        path: {
          ...repositoryPath(repository),
          artifact_id: parseForgejoId(artifactId, "artifact id"),
        },
      }, requestOptions(options.signal)),
    options.signal,
    isArtifactPayload,
  );
  return normalizeForgejoCiArtifact(await context.client(), payload);
}

function normalizeForgejoCiArtifact<V extends ForgejoVersion>(
  client: ForgejoClient<V>,
  payload: AnyArtifact,
): CiArtifactData<"forgejo", V> {
  return Object.freeze({
    id: String(payload.id),
    ...(payload.run_id === undefined ? {} : { runId: String(payload.run_id) }),
    name: payload.name,
    ...(payload.size_in_bytes === undefined
      ? {}
      : { size: safeInteger(payload.size_in_bytes, true) }),
    ...(payload.expired === undefined ? {} : { expired: payload.expired }),
    ...(payload.created_at === undefined ? {} : { createdAt: payload.created_at }),
    ...(payload.expires_at === undefined ? {} : { expiresAt: payload.expires_at }),
    ...(payload.archive_download_url === undefined ? {} : { url: payload.archive_download_url }),
    native: createForgejoCiEntityNative(
      "artifact",
      client,
      payload as ForgejoCiEntityPayload<V, "artifact">,
    ),
  });
}
