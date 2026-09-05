import type { FileChange } from "../../../fluent-api/adapter-contract/content.ts";

import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import type { ValidatedChange } from "./payload-types.ts";
import { validationContext, validationError } from "./validation.ts";

import { encodeContent } from "./encoding.ts";

export function validateFileChanges<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  changes: readonly FileChange[],
): readonly ValidatedChange[] {
  if (changes.length === 0) {
    throw validationError(context, "commitFileChanges", "file-change batch cannot be empty");
  }
  const destinations = new Set<string>();
  const sources = new Set<string>();
  const errorContext = validationContext(context, "commitFileChanges");
  const validated = changes.map((change): ValidatedChange => {
    const path = requireIdentity(change.path, "file-change path", errorContext);
    if (destinations.has(path)) {
      throw validationError(
        context,
        "commitFileChanges",
        `file-change path ${path} appears more than once`,
      );
    }
    destinations.add(path);
    const sha = "sha" in change && change.sha !== undefined
      ? requireIdentity(change.sha, "file SHA", errorContext)
      : undefined;
    switch (change.operation) {
      case "create":
        return {
          operation: "create",
          path,
          existingPath: path,
          content: encodeContent(change.content),
          needsSha: false,
        };
      case "upsert":
        return {
          operation: "upload",
          path,
          existingPath: path,
          content: encodeContent(change.content),
          needsSha: false,
        };
      case "update":
        sources.add(path);
        return {
          operation: "update",
          path,
          existingPath: path,
          content: encodeContent(change.content),
          ...(sha === undefined ? {} : { sha }),
          needsSha: true,
        };
      case "delete":
        sources.add(path);
        return {
          operation: "delete",
          path,
          existingPath: path,
          ...(sha === undefined ? {} : { sha }),
          needsSha: true,
        };
      case "move": {
        const fromPath = requireIdentity(
          change.fromPath,
          "moved file source path",
          errorContext,
        );
        if (fromPath === path) {
          throw validationError(
            context,
            "commitFileChanges",
            `moved file source and destination are both ${path}`,
          );
        }
        if (sources.has(fromPath)) {
          throw validationError(
            context,
            "commitFileChanges",
            `file-change source ${fromPath} appears more than once`,
          );
        }
        sources.add(fromPath);
        return {
          operation: "rename",
          path,
          existingPath: fromPath,
          fromPath,
          ...(sha === undefined ? {} : { sha }),
          needsSha: true,
        };
      }
    }
  });
  for (const change of validated) {
    if (change.operation === "rename" && destinations.has(change.existingPath)) {
      throw validationError(
        context,
        "commitFileChanges",
        `file-change source ${change.existingPath} conflicts with another destination`,
      );
    }
  }
  return Object.freeze(validated);
}
