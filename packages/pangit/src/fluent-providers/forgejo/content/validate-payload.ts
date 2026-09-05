import type {
  AnyForgejoContent,
  AnyForgejoFilesResponse,
  ForgejoContents,
} from "./payload-types.ts";

export function isContents(value: unknown): value is ForgejoContents {
  return isContentPayload(value) || isContentArray(value);
}

export function isContentArray(value: unknown): value is readonly AnyForgejoContent[] {
  return Array.isArray(value) && value.every(isContentPayload);
}

export function isFilesResponse(value: unknown): value is AnyForgejoFilesResponse {
  if (!isRecord(value) || !isRecord(value.commit)) return false;
  return hasText(value.commit.sha) && hasText(value.commit.message) &&
    (value.commit.parents === undefined ||
      Array.isArray(value.commit.parents) &&
        value.commit.parents.every((parent) => isRecord(parent) && hasText(parent.sha)));
}

function isContentPayload(value: unknown): value is AnyForgejoContent {
  if (!isRecord(value)) return false;
  if (!hasText(value.path) || !hasText(value.name)) return false;
  if (!["file", "dir", "symlink", "submodule"].includes(String(value.type))) return false;
  if (value.size !== undefined && optionalNonNegativeInteger(value.size) === undefined) {
    return false;
  }
  if (value.type === "symlink" && !hasText(value.target)) return false;
  if (value.type === "submodule" && !hasText(value.submodule_git_url)) return false;
  return true;
}

export function requiredText(value: unknown, name: string): string {
  const text = optionalText(value);
  if (text === undefined || text.trim().length === 0) throw new TypeError(`${name} is missing`);
  return text;
}

export function optionalText(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function optionalNonNegativeInteger(value: unknown): number | undefined {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string"
    ? Number(value)
    : NaN;
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
