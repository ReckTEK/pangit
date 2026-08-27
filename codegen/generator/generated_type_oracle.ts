import type { OpenApiRequestBodyFamily, OpenApiResponseBodyFamily } from "./media_oracle.ts";

export type ParsedRequestBodyType = {
  mediaType: string;
  bodySyntax: string;
  family: OpenApiRequestBodyFamily | "unrecognized";
};

export type ParsedResponseType = {
  status: number | "default";
  statusDomain: "all" | "exact" | "failure" | "success";
  excludedStatuses: readonly number[];
  statusSyntax: string;
  ok: boolean | "boolean";
  mediaType: string | undefined;
  bodySyntax: string;
  family: OpenApiResponseBodyFamily | "unrecognized";
};

/**
 * Extract selected exported type-alias right-hand sides with a lexical, balanced-delimiter scan.
 * This intentionally does not parse generated source with aggregate regular expressions: comments,
 * quoted strings, nested object members, and nested generic arguments cannot terminate an alias.
 */
export function extractExportedTypeAliases(
  source: string,
  wantedNames: ReadonlySet<string>,
): ReadonlyMap<string, string> {
  const aliases = new Map<string, string>();
  let cursor = 0;
  while (cursor < source.length) {
    const lexicalEnd = skipLexicalElement(source, cursor);
    if (lexicalEnd !== cursor) {
      cursor = lexicalEnd;
      continue;
    }
    const identifier = readIdentifier(source, cursor);
    if (identifier === undefined) {
      cursor++;
      continue;
    }
    cursor = identifier.end;
    if (identifier.value !== "export") continue;

    let next = skipTrivia(source, cursor);
    const declaration = readIdentifier(source, next);
    if (declaration?.value !== "type") continue;
    next = skipTrivia(source, declaration.end);
    const name = readIdentifier(source, next);
    if (name === undefined) continue;
    next = skipTrivia(source, name.end);
    if (source[next] !== "=") continue;

    const valueStart = next + 1;
    const valueEnd = findTypeAliasEnd(source, valueStart);
    if (wantedNames.has(name.value)) {
      if (aliases.has(name.value)) throw new Error(`Duplicate exported type alias ${name.value}`);
      aliases.set(name.value, source.slice(valueStart, valueEnd).trim());
    }
    cursor = valueEnd + 1;
  }

  const missing = [...wantedNames].filter((name) => !aliases.has(name)).toSorted(compareText);
  if (missing.length > 0) {
    throw new Error(`Missing generated type aliases: ${missing.join(", ")}`);
  }
  return aliases;
}

/** Parse every generated `RestBody<media, body>` member within one input alias. */
export function parseRequestBodyTypes(alias: string): ParsedRequestBodyType[] {
  return findGenericArguments(alias, "RestBody").map((arguments_) => {
    if (arguments_.length !== 2) {
      throw new Error(`RestBody requires 2 type arguments, received ${arguments_.length}`);
    }
    const mediaType = parseStringType(arguments_[0], "RestBody media type");
    const bodySyntax = arguments_[1].trim();
    return {
      mediaType,
      bodySyntax,
      family: requestBodySyntaxFamily(bodySyntax),
    };
  });
}

/** Parse every generated `RestResponse<status, body, media, ...>` member in one response alias. */
export function parseResponseTypes(alias: string): ParsedResponseType[] {
  return findGenericArguments(alias, "RestResponse").map((arguments_) => {
    if (arguments_.length < 4 || arguments_.length > 5) {
      throw new Error(`RestResponse requires 4 or 5 type arguments, received ${arguments_.length}`);
    }
    const bodySyntax = arguments_[1].trim();
    const parsedStatus = parseResponseStatus(arguments_[0]);
    return {
      ...parsedStatus,
      statusSyntax: arguments_[0].trim(),
      ok: parseOkType(arguments_[3]),
      mediaType: parseOptionalStringType(arguments_[2], "RestResponse media type"),
      bodySyntax,
      family: responseBodySyntaxFamily(bodySyntax),
    };
  });
}

export function requestBodySyntaxFamily(
  bodySyntax: string,
): OpenApiRequestBodyFamily | "unrecognized" {
  if (bodySyntax.trim() === "string") return "text";
  if (bodySyntax.trim() === "RestBinary") return "binary";
  const form = parseWholeGeneric(bodySyntax, "RestRequestValue");
  if (form !== undefined && form.length === 1) return "form";
  const json = parseWholeGeneric(bodySyntax, "RestJsonValue");
  if (
    json !== undefined && json.length === 1 &&
    parseWholeGeneric(json[0], "RestRequestValue")?.length === 1
  ) {
    return "json";
  }
  return "unrecognized";
}

export function responseBodySyntaxFamily(
  bodySyntax: string,
): OpenApiResponseBodyFamily | "unrecognized" {
  const value = bodySyntax.trim();
  if (value === "undefined") return "undefined";
  if (value === "globalThis.Blob") return "blob";
  if (parseWholeGeneric(value, "RestJsonValue")?.length === 1) return "json";
  if (value === "string" || isStringLiteralUnion(value)) return "string";
  return "unrecognized";
}

function findGenericArguments(source: string, target: string): string[][] {
  const results: string[][] = [];
  let cursor = 0;
  while (cursor < source.length) {
    const lexicalEnd = skipLexicalElement(source, cursor);
    if (lexicalEnd !== cursor) {
      cursor = lexicalEnd;
      continue;
    }
    const identifier = readIdentifier(source, cursor);
    if (identifier === undefined) {
      cursor++;
      continue;
    }
    cursor = identifier.end;
    if (identifier.value !== target) continue;
    const open = skipTrivia(source, cursor);
    if (source[open] !== "<") continue;
    const close = findMatchingAngle(source, open);
    results.push(splitTopLevel(source.slice(open + 1, close), ","));
    cursor = close + 1;
  }
  return results;
}

function parseWholeGeneric(value: string, target: string): string[] | undefined {
  const source = value.trim();
  const identifier = readIdentifier(source, 0);
  if (identifier?.value !== target) return undefined;
  const open = skipTrivia(source, identifier.end);
  if (source[open] !== "<") return undefined;
  const close = findMatchingAngle(source, open);
  if (skipTrivia(source, close + 1) !== source.length) return undefined;
  return splitTopLevel(source.slice(open + 1, close), ",");
}

function isStringLiteralUnion(value: string): boolean {
  const members = splitTopLevel(value, "|");
  if (members.length === 0) return false;
  return members.every((member) => {
    try {
      return typeof JSON.parse(member.trim()) === "string";
    } catch {
      return false;
    }
  });
}

function parseResponseStatus(
  value: string,
): {
  status: number | "default";
  statusDomain: "all" | "exact" | "failure" | "success";
  excludedStatuses: readonly number[];
} {
  const status = value.trim();
  if (status === "number" || status === "RestHttpStatus") {
    return { status: "default", statusDomain: "all", excludedStatuses: [] };
  }
  if (status === "RestSuccessfulStatus") {
    return { status: "default", statusDomain: "success", excludedStatuses: [] };
  }
  const excluded = parseWholeGeneric(status, "Exclude");
  if (
    excluded !== undefined && excluded.length === 2 &&
    ["RestHttpStatus", "RestSuccessfulStatus"].includes(excluded[0].trim())
  ) {
    const exclusions = splitTopLevel(excluded[1], "|");
    const excludesSuccessful = exclusions.some((member) =>
      member.trim() === "RestSuccessfulStatus"
    );
    const excludedStatuses = exclusions.flatMap((member) => {
      if (member.trim() === "RestSuccessfulStatus") return [];
      const parsed = Number(member.trim());
      if (!Number.isInteger(parsed)) {
        throw new Error(`Invalid excluded RestResponse status ${JSON.stringify(member.trim())}`);
      }
      return [parsed];
    });
    const base = excluded[0].trim();
    return {
      status: "default",
      statusDomain: base === "RestSuccessfulStatus"
        ? "success"
        : excludesSuccessful
        ? "failure"
        : "all",
      excludedStatuses,
    };
  }
  if (status.length === 0 || [...status].some((character) => character < "0" || character > "9")) {
    throw new Error(`Invalid RestResponse status type ${JSON.stringify(status)}`);
  }
  const parsed = Number(status);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid RestResponse status type ${JSON.stringify(status)}`);
  }
  return { status: parsed, statusDomain: "exact", excludedStatuses: [] };
}

function parseOkType(value: string): boolean | "boolean" {
  const ok = value.trim();
  if (ok === "true") return true;
  if (ok === "false") return false;
  if (ok === "boolean") return "boolean";
  throw new Error(`Invalid RestResponse ok type ${JSON.stringify(ok)}`);
}

function parseOptionalStringType(value: string, label: string): string | undefined {
  return value.trim() === "undefined" ? undefined : parseStringType(value, label);
}

function parseStringType(value: string, label: string): string {
  try {
    const parsed: unknown = JSON.parse(value.trim());
    if (typeof parsed === "string") return parsed;
  } catch {
    // Report one stable domain error below.
  }
  throw new Error(`${label} is not a string literal: ${value.trim()}`);
}

function findTypeAliasEnd(source: string, start: number): number {
  const depth = emptyDepth();
  let cursor = start;
  while (cursor < source.length) {
    const lexicalEnd = skipLexicalElement(source, cursor);
    if (lexicalEnd !== cursor) {
      cursor = lexicalEnd;
      continue;
    }
    const character = source[cursor];
    if (character === ";" && atTopLevel(depth)) return cursor;
    updateDepth(depth, character, source, cursor);
    cursor++;
  }
  throw new Error("Generated type alias has no terminating semicolon");
}

function findMatchingAngle(source: string, open: number): number {
  if (source[open] !== "<") throw new Error("Expected opening generic delimiter");
  let depth = 1;
  let cursor = open + 1;
  while (cursor < source.length) {
    const lexicalEnd = skipLexicalElement(source, cursor);
    if (lexicalEnd !== cursor) {
      cursor = lexicalEnd;
      continue;
    }
    if (source[cursor] === "<") depth++;
    else if (source[cursor] === ">" && source[cursor - 1] !== "=") {
      depth--;
      if (depth === 0) return cursor;
    }
    cursor++;
  }
  throw new Error("Generated generic type has no closing delimiter");
}

function splitTopLevel(source: string, separator: "," | "|"): string[] {
  const result: string[] = [];
  const depth = emptyDepth();
  let start = 0;
  let cursor = 0;
  while (cursor < source.length) {
    const lexicalEnd = skipLexicalElement(source, cursor);
    if (lexicalEnd !== cursor) {
      cursor = lexicalEnd;
      continue;
    }
    const character = source[cursor];
    if (character === separator && atTopLevel(depth)) {
      result.push(source.slice(start, cursor).trim());
      start = cursor + 1;
    } else {
      updateDepth(depth, character, source, cursor);
    }
    cursor++;
  }
  result.push(source.slice(start).trim());
  return result;
}

type DelimiterDepth = {
  angle: number;
  brace: number;
  bracket: number;
  parenthesis: number;
};

function emptyDepth(): DelimiterDepth {
  return { angle: 0, brace: 0, bracket: 0, parenthesis: 0 };
}

function atTopLevel(depth: DelimiterDepth): boolean {
  return depth.angle === 0 && depth.brace === 0 && depth.bracket === 0 &&
    depth.parenthesis === 0;
}

function updateDepth(
  depth: DelimiterDepth,
  character: string,
  source: string,
  cursor: number,
): void {
  if (character === "<") depth.angle++;
  else if (character === ">" && source[cursor - 1] !== "=" && depth.angle > 0) depth.angle--;
  else if (character === "{") depth.brace++;
  else if (character === "}" && depth.brace > 0) depth.brace--;
  else if (character === "[") depth.bracket++;
  else if (character === "]" && depth.bracket > 0) depth.bracket--;
  else if (character === "(") depth.parenthesis++;
  else if (character === ")" && depth.parenthesis > 0) depth.parenthesis--;
}

function skipTrivia(source: string, start: number): number {
  let cursor = start;
  while (cursor < source.length) {
    if (/\s/.test(source[cursor])) {
      cursor++;
      continue;
    }
    const commentEnd = skipComment(source, cursor);
    if (commentEnd !== cursor) {
      cursor = commentEnd;
      continue;
    }
    return cursor;
  }
  return cursor;
}

function skipLexicalElement(source: string, cursor: number): number {
  const commentEnd = skipComment(source, cursor);
  if (commentEnd !== cursor) return commentEnd;
  return source[cursor] === '"' || source[cursor] === "'" || source[cursor] === "`"
    ? skipQuoted(source, cursor)
    : cursor;
}

function skipComment(source: string, cursor: number): number {
  if (source.startsWith("//", cursor)) {
    const end = source.indexOf("\n", cursor + 2);
    return end === -1 ? source.length : end + 1;
  }
  if (source.startsWith("/*", cursor)) {
    const end = source.indexOf("*/", cursor + 2);
    if (end === -1) throw new Error("Unterminated generated source comment");
    return end + 2;
  }
  return cursor;
}

function skipQuoted(source: string, cursor: number): number {
  const quote = source[cursor];
  cursor++;
  while (cursor < source.length) {
    if (source[cursor] === "\\") {
      cursor += 2;
      continue;
    }
    if (source[cursor] === quote) return cursor + 1;
    cursor++;
  }
  throw new Error("Unterminated generated source string");
}

function readIdentifier(
  source: string,
  start: number,
): { value: string; end: number } | undefined {
  if (!isIdentifierStart(source[start])) return undefined;
  let end = start + 1;
  while (isIdentifierPart(source[end])) end++;
  return { value: source.slice(start, end), end };
}

function isIdentifierStart(character: string | undefined): boolean {
  return character !== undefined &&
    (character === "$" || character === "_" ||
      (character >= "A" && character <= "Z") ||
      (character >= "a" && character <= "z"));
}

function isIdentifierPart(character: string | undefined): boolean {
  return isIdentifierStart(character) ||
    (character !== undefined && character >= "0" && character <= "9");
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
