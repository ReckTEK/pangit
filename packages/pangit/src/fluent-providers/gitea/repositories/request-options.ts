import { ValidationError } from "../../../fluent-api/adapter-contract/errors.ts";
import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import { optionalText } from "./validate-payload.ts";

export function currentUserName<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
): string | undefined {
  return optionalText(context.currentUser()?.login);
}

export function requestOptions(signal?: AbortSignal): { readonly signal: AbortSignal } | undefined {
  return signal === undefined ? undefined : { signal };
}

export function repositoryPath(repository: { readonly owner: string; readonly name: string }) {
  return {
    owner: requireIdentity(repository.owner, "repository owner"),
    repo: requireIdentity(repository.name, "repository name"),
  };
}

export function validationError<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  message: string,
): ValidationError {
  return new ValidationError(message, {
    provider: "gitea",
    version: context.version,
    operation,
  });
}
