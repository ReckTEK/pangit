import { ProviderInvariantError } from "../../../fluent-api/adapter-contract/errors.ts";

import {
  requireIdentity,
  requirePositiveInteger,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";
import type { GiteaPullRequestReviewPayload } from "../native/GiteaPullRequestReviewNative.ts";

export type AnyGiteaReview = GiteaPullRequestReviewPayload<GiteaVersion>;

export function requireReviewArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  value: unknown,
): readonly AnyGiteaReview[] {
  if (!Array.isArray(value) || !value.every(isReviewPayload)) {
    throw invariant(context, operation, "returned a malformed pull-request review list");
  }
  return value;
}

export function isReviewPayload(value: unknown): value is AnyGiteaReview {
  if (typeof value !== "object" || value === null) return false;
  const review = value as AnyGiteaReview;
  return (typeof review.id === "number" || typeof review.id === "bigint") && review.id > 0 &&
    (review.state === undefined || typeof review.state === "string");
}

export function pullRequestNumber(value: { readonly number: number }): number {
  return requirePositiveInteger(value.number, "pull-request number");
}

export function parsePositiveInt64(value: string, name: string): bigint {
  const text = requireIdentity(value, name);
  if (!/^[1-9]\d*$/.test(text)) throw new TypeError(`${name} must be a positive integer`);
  return BigInt(text);
}

export function requiredPositiveId(value: unknown, name: string): string {
  if ((typeof value !== "number" && typeof value !== "bigint") || value <= 0) {
    throw new TypeError(`${name} is missing`);
  }
  return String(value);
}

export function optionalText(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function invariant<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  message: string,
): ProviderInvariantError {
  return new ProviderInvariantError(`${operation} ${message}`, {
    provider: "gitea",
    version: context.version,
    operation,
  });
}
