const identifierReservedWords = new Set([
  "abstract",
  "any",
  "as",
  "asserts",
  "async",
  "await",
  "bigint",
  "boolean",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "constructor",
  "continue",
  "debugger",
  "declare",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "get",
  "if",
  "implements",
  "import",
  "in",
  "infer",
  "instanceof",
  "interface",
  "is",
  "keyof",
  "let",
  "module",
  "namespace",
  "never",
  "new",
  "null",
  "number",
  "object",
  "of",
  "package",
  "private",
  "protected",
  "public",
  "readonly",
  "require",
  "return",
  "satisfies",
  "set",
  "static",
  "string",
  "super",
  "switch",
  "symbol",
  "this",
  "throw",
  "true",
  "try",
  "type",
  "typeof",
  "undefined",
  "unique",
  "unknown",
  "using",
  "var",
  "void",
  "while",
  "with",
  "yield",
]);

export type IdentifierStyle = "camel" | "pascal";

export type NameRequest = {
  key: string;
  preferred: string;
};

export function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function toIdentifier(value: string, style: IdentifierStyle): string {
  const separated = value
    .replaceAll(/([a-z\d])([A-Z])/g, "$1 $2")
    .replaceAll(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  const words = separated.match(/[A-Za-z\d]+/g) ?? [];
  const normalized = words.map((word) =>
    `${word[0]?.toUpperCase() ?? ""}${word.slice(1).toLowerCase()}`
  )
    .join("");
  let identifier = normalized === "" ? "Value" : normalized;

  if (style === "camel") {
    identifier = `${identifier[0]?.toLowerCase() ?? "v"}${identifier.slice(1)}`;
  }
  if (/^\d/.test(identifier)) {
    identifier = style === "pascal" ? `N${identifier}` : `n${identifier}`;
  }
  if (identifierReservedWords.has(identifier.toLowerCase())) {
    identifier += style === "pascal" ? "Type" : "Operation";
  }
  return identifier;
}

/** Allocate stable, collision-safe identifiers without depending on source document ordering. */
export function allocateNames(
  requests: readonly NameRequest[],
  style: IdentifierStyle,
  reserved: ReadonlySet<string> = new Set(),
  maximumLength = 96,
  locked: ReadonlyMap<string, string> = new Map(),
): ReadonlyMap<string, string> {
  const requestKeys = new Set<string>();
  const candidates = requests.map((request) => {
    if (requestKeys.has(request.key)) {
      throw new Error(`Duplicate generated name key ${request.key}`);
    }
    requestKeys.add(request.key);
    let candidate = toIdentifier(request.preferred, style);
    if (candidate.length > maximumLength) {
      candidate = `${candidate.slice(0, maximumLength - 9)}_${stableHash(request.key)}`;
    }
    return { ...request, candidate };
  });
  const groups = new Map<string, typeof candidates>();
  for (const candidate of candidates) {
    const key = candidate.candidate.toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), candidate]);
  }

  const result = new Map<string, string>();
  const used = new Set([...reserved].map((name) => name.toLowerCase()));
  const lockedUsed = new Set<string>();
  for (const candidate of candidates.toSorted((left, right) => compareText(left.key, right.key))) {
    const lockedName = locked.get(candidate.key);
    if (lockedName === undefined) continue;
    if (!/^[A-Za-z_$][\w$]*$/.test(lockedName) || lockedName.length > maximumLength) {
      throw new Error(`Locked generated name is invalid for ${candidate.key}: ${lockedName}`);
    }
    if (lockedUsed.has(lockedName.toLowerCase())) {
      throw new Error(`Locked generated name collides for ${candidate.key}: ${lockedName}`);
    }
    lockedUsed.add(lockedName.toLowerCase());
    used.add(lockedName.toLowerCase());
    result.set(candidate.key, lockedName);
  }
  for (const candidate of candidates.toSorted((left, right) => compareText(left.key, right.key))) {
    if (result.has(candidate.key)) continue;
    const collides = (groups.get(candidate.candidate.toLowerCase())?.length ?? 0) > 1 ||
      used.has(candidate.candidate.toLowerCase());
    let allocated = collides
      ? withHash(candidate.candidate, candidate.key, maximumLength)
      : candidate.candidate;
    let salt = 0;
    while (used.has(allocated.toLowerCase())) {
      allocated = withHash(candidate.candidate, `${candidate.key}:${++salt}`, maximumLength);
    }
    used.add(allocated.toLowerCase());
    result.set(candidate.key, allocated);
  }
  return result;
}

export function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, "0").slice(-7);
}

export function renderJsDoc(
  values: readonly (string | undefined)[],
  options: { deprecated?: boolean; indent?: string; tags?: readonly string[] } = {},
): string {
  const paragraphs = values
    .filter((value): value is string => typeof value === "string" && value.trim() !== "")
    .map((value) => value.replaceAll("*/", "*\\/").replaceAll("\r\n", "\n").trim());
  const tags = [...(options.tags ?? [])];
  if (options.deprecated) {
    tags.push("@deprecated");
  }
  if (paragraphs.length === 0 && tags.length === 0) {
    return "";
  }

  const indent = options.indent ?? "";
  const lines = ["/**"];
  paragraphs.forEach((paragraph, index) => {
    if (index > 0) lines.push(" *");
    for (const line of paragraph.split("\n")) {
      lines.push(` *${line === "" ? "" : ` ${line}`}`);
    }
  });
  if (tags.length > 0 && paragraphs.length > 0) lines.push(" *");
  for (const tag of tags) lines.push(` * ${tag}`);
  lines.push(" */");
  return lines.map((line) => `${indent}${line}`).join("\n");
}

function withHash(candidate: string, key: string, maximumLength: number): string {
  const suffix = `_${stableHash(key)}`;
  return `${candidate.slice(0, maximumLength - suffix.length)}${suffix}`;
}
