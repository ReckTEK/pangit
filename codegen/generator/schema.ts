import { compareText, renderJsDoc } from "./naming.ts";
import {
  asBoolean,
  asObject,
  asString,
  type JsonObject,
  objectEntries,
  referenceName,
} from "./openapi.ts";

export class SchemaRenderer {
  readonly #componentNames: ReadonlyMap<string, string>;

  constructor(componentNames: ReadonlyMap<string, string>) {
    this.#componentNames = componentNames;
  }

  render(schemaValue: unknown): string {
    if (typeof schemaValue === "boolean") return schemaValue ? "unknown" : "never";
    const schema = asObject(schemaValue);
    if (schema === undefined) return "unknown";

    const reference = asString(schema.$ref);
    if (reference !== undefined) {
      const component = referenceName(reference);
      if (component === undefined) {
        throw new Error(`Unsupported schema reference ${reference}`);
      }
      const result = this.#componentNames.get(component);
      if (result === undefined) {
        throw new Error(`Unresolved component schema reference ${reference}`);
      }
      return asBoolean(schema.nullable) ? union([result, "null"]) : result;
    }

    const properties = asObject(schema.properties);
    const oneOf = this.#renderMembers(schema.oneOf, "union", properties);
    const anyOf = this.#renderMembers(schema.anyOf, "union", properties);
    const allOf = this.#renderMembers(schema.allOf, "intersection");
    const own = this.#renderOwnSchema(schema);

    let result = own;
    const alternativeConstraints = [...oneOf, ...anyOf];
    if (alternativeConstraints.length > 0) {
      result = intersection([
        ...alternativeConstraints,
        ...(own === "unknown" ? [] : [own]),
      ]);
    }
    if (allOf.length > 0) {
      result = intersection([...allOf, ...(result === "unknown" ? [] : [result])]);
    }
    if (asBoolean(schema.nullable)) {
      result = union([result, "null"]);
    }
    return result;
  }

  renderComponent(name: string, schema: JsonObject): string {
    const alias = this.#componentNames.get(name);
    if (alias === undefined) {
      throw new Error(`Missing TypeScript name for component schema ${name}`);
    }
    const documentation = renderJsDoc(
      [asString(schema.title), asString(schema.description)],
      { deprecated: asBoolean(schema.deprecated) },
    );
    return `${documentation === "" ? "" : `${documentation}\n`}export type ${alias} = ${
      this.render(schema)
    };`;
  }

  #renderMembers(
    value: unknown,
    mode: "intersection" | "union",
    inheritedProperties?: JsonObject,
  ): string[] {
    if (!Array.isArray(value)) return [];
    const rendered = value.map((member) =>
      this.render(
        mode === "union" ? inheritRequiredProperties(member, inheritedProperties) : member,
      )
    );
    return mode === "union" ? [union(rendered)] : rendered;
  }

  #renderOwnSchema(schema: JsonObject): string {
    if (Array.isArray(schema.enum) && schema.enum.length > 0) {
      return union(schema.enum.map(renderLiteral));
    }
    if ("const" in schema) {
      return renderLiteral(schema.const);
    }

    const type = asString(schema.type);
    if (type === "array" || schema.items !== undefined) {
      return `Array<${this.render(schema.items)}>`;
    }
    if (
      type === "object" ||
      asObject(schema.properties) !== undefined ||
      schema.additionalProperties !== undefined ||
      Array.isArray(schema.required)
    ) {
      return this.#renderObject(schema);
    }
    if (type === "string" || type === "text") {
      return isBinaryFormat(asString(schema.format)) ? "RestBinary" : "string";
    }
    if (type === "integer") {
      return asString(schema.format)?.toLowerCase() === "int32" ? "number" : "RestInt64";
    }
    if (type === "number") return "RestJsonNumber";
    if (type === "boolean") return "boolean";
    if (type === "null") return "null";
    return "unknown";
  }

  #renderObject(schema: JsonObject): string {
    const required = new Set(
      Array.isArray(schema.required)
        ? schema.required.filter((name): name is string => typeof name === "string")
        : [],
    );
    const declaredProperties = objectEntries(schema.properties)
      .filter((entry): entry is [string, JsonObject | boolean] =>
        asObject(entry[1]) !== undefined || typeof entry[1] === "boolean"
      )
      .map(([name, value]) => [name, value] as const);
    const declaredNames = new Set(declaredProperties.map(([name]) => name));
    const requiredPropertySchema: JsonObject | boolean =
      typeof schema.additionalProperties === "boolean"
        ? schema.additionalProperties
        : asObject(schema.additionalProperties) ?? true;
    const properties: readonly (readonly [string, JsonObject | boolean])[] = [
      ...declaredProperties,
      ...[...required]
        .filter((name) => !declaredNames.has(name))
        .map((name) => [name, requiredPropertySchema] as const),
    ].toSorted(([left], [right]) => compareText(left, right));

    let objectType: string;
    if (properties.length === 0) {
      objectType = "Record<string, never>";
    } else {
      const lines = ["{"];
      for (const [name, property] of properties) {
        const propertyObject = asObject(property);
        if (asBoolean(propertyObject?.writeOnly)) {
          throw new Error(
            `Schema property ${name} uses writeOnly, which requires a response projection`,
          );
        }
        const documentation = renderJsDoc(
          [asString(propertyObject?.title), asString(propertyObject?.description)],
          { deprecated: asBoolean(propertyObject?.deprecated), indent: "  " },
        );
        if (documentation !== "") lines.push(documentation);
        const readonly = asBoolean(propertyObject?.readOnly) ? "readonly " : "";
        const optional = required.has(name) ? "" : "?";
        lines.push(
          `  ${readonly}${JSON.stringify(name)}${optional}: ${
            indentContinuation(this.render(property), 2)
          };`,
        );
      }
      lines.push("}");
      objectType = lines.join("\n");
    }

    if (schema.additionalProperties === false) {
      return objectType;
    }
    const additionalType = asObject(schema.additionalProperties) === undefined
      ? "unknown"
      : this.render(schema.additionalProperties);
    const additionalSchema = asObject(schema.additionalProperties);
    if (additionalSchema !== undefined) {
      for (const [name, property] of properties) {
        if (schemasAreDefinitelyDisjoint(property, additionalSchema)) {
          throw new Error(
            `Schema property ${name} is incompatible with typed additionalProperties`,
          );
        }
      }
    }
    if (properties.length === 0) {
      return `Record<string, ${additionalType}>`;
    }
    return intersection([objectType, `Record<string, ${additionalType}>`]);
  }
}

function inheritRequiredProperties(
  schemaValue: unknown,
  inheritedProperties: JsonObject | undefined,
): unknown {
  const schema = asObject(schemaValue);
  if (schema === undefined || !Array.isArray(schema.required)) {
    return schemaValue;
  }

  const properties = asObject(schema.properties) ?? {};
  const inherited = inheritedProperties ?? {};
  const additions = schema.required.flatMap((name) => {
    if (typeof name !== "string" || Object.hasOwn(properties, name)) {
      return [];
    }
    return [
      [
        name,
        Object.hasOwn(inherited, name) ? inherited[name] : true,
      ] as const,
    ];
  });
  if (additions.length === 0) return schemaValue;

  return {
    ...schema,
    properties: Object.fromEntries([...objectEntries(properties), ...additions]),
  };
}

export function union(values: readonly string[]): string {
  const members = uniqueTypes(values).filter((value) => value !== "never");
  if (members.includes("unknown")) return "unknown";
  if (members.length === 0) return "never";
  if (members.length === 1) return members[0];
  return members.map((member) => member.includes(" & ") ? `(${member})` : member).join(" | ");
}

export function intersection(values: readonly string[]): string {
  const members = uniqueTypes(values).filter((value) => value !== "unknown");
  if (members.includes("never")) return "never";
  if (members.length === 0) return "unknown";
  if (members.length === 1) return members[0];
  return members.map((member) => member.includes(" | ") ? `(${member})` : member).join(" & ");
}

function uniqueTypes(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value !== ""))].toSorted(compareText);
}

function renderLiteral(value: unknown): string {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  return "unknown";
}

function isBinaryFormat(format: string | undefined): boolean {
  return format !== undefined && ["binary", "stream"].includes(format.toLowerCase());
}

function schemasAreDefinitelyDisjoint(left: unknown, right: JsonObject): boolean {
  const leftKinds = schemaValueKinds(left);
  const rightKinds = schemaValueKinds(right);
  if (leftKinds === undefined || rightKinds === undefined) return false;
  return ![...leftKinds].some((kind) =>
    rightKinds.has(kind) ||
    (kind === "integer" && rightKinds.has("number")) ||
    (kind === "number" && rightKinds.has("integer"))
  );
}

function schemaValueKinds(value: unknown): ReadonlySet<string> | undefined {
  if (typeof value === "boolean") return value ? undefined : new Set();
  const schema = asObject(value);
  if (schema === undefined || asString(schema.$ref) !== undefined) return undefined;
  const kinds = new Set<string>();
  const type = asString(schema.type);
  if (type !== undefined) kinds.add(type);
  if (Object.hasOwn(schema, "const")) kinds.add(literalKind(schema.const));
  if (Array.isArray(schema.enum)) {
    for (const member of schema.enum) kinds.add(literalKind(member));
  }
  if (asBoolean(schema.nullable)) kinds.add("null");
  kinds.delete("unknown");
  return kinds.size === 0 ? undefined : kinds;
}

function literalKind(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  return ["string", "boolean"].includes(typeof value) ? typeof value : "unknown";
}

function indentContinuation(value: string, spaces: number): string {
  const indent = " ".repeat(spaces);
  return value.replaceAll("\n", `\n${indent}`);
}
