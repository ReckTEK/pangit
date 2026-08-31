import { SchemaRenderer } from "./schema.ts";

Deno.test("schema unions are stable, nullable, and reference type aliases", () => {
  const renderer = new SchemaRenderer(new Map([["example", "Example"]]));
  const rendered = renderer.render({
    nullable: true,
    oneOf: [
      { enum: ["z", "a", "a"] },
      { $ref: "#/components/schemas/example" },
    ],
  });

  assertEquals(rendered, '"a" | "z" | Example | null');
});

Deno.test("object schemas preserve wire names and use type expressions", () => {
  const renderer = new SchemaRenderer(new Map());
  const rendered = renderer.render({
    type: "object",
    additionalProperties: false,
    required: ["odd-name"],
    properties: {
      "odd-name": { type: "string" },
      count: { type: "integer" },
    },
  });

  assert(rendered.includes('"odd-name": string;'), "required wire property was not preserved");
  assert(rendered.includes('"count"?: RestInt64;'), "optional property was not preserved");
  assert(!rendered.includes("interface"), "schema renderer must emit type expressions only");
});

Deno.test("alternative required lists reuse outer object property schemas", () => {
  const renderer = new SchemaRenderer(new Map());
  const alternatives = [
    {
      additionalProperties: true,
      properties: { status: { enum: ["completed"] } },
      required: ["status", "conclusion"],
    },
    {
      additionalProperties: true,
      properties: { status: { enum: ["queued"] } },
      required: ["status"],
    },
  ];
  const properties = {
    conclusion: { enum: ["success", "failure"] },
    name: { type: "string" },
    status: { enum: ["queued", "completed"] },
  };

  for (const keyword of ["oneOf", "anyOf"] as const) {
    const rendered = renderer.render({
      type: "object",
      properties,
      required: ["name"],
      [keyword]: alternatives,
    });
    const reordered = renderer.render({
      type: "object",
      properties: {
        status: properties.status,
        name: properties.name,
        conclusion: properties.conclusion,
      },
      required: ["name"],
      [keyword]: alternatives.toReversed(),
    });

    assertEquals(rendered, reordered);
    assert(
      rendered.includes('"conclusion": "failure" | "success";'),
      `${keyword} branch did not require its inherited conclusion property`,
    );
  }
});

Deno.test("alternative required lists preserve undeclared and boolean-schema properties", () => {
  const renderer = new SchemaRenderer(new Map());
  const rendered = renderer.render({
    type: "object",
    properties: { permitted: true, forbidden: false },
    oneOf: [
      { required: ["undeclared"] },
      { required: ["permitted", "forbidden"] },
    ],
  });

  assert(rendered.includes('"undeclared": unknown;'), "undeclared required field was lost");
  assert(rendered.includes('"permitted": unknown;'), "true schema field was lost");
  assert(rendered.includes('"forbidden": never;'), "false schema field was weakened");
});

Deno.test("object required lists preserve undeclared fields using additional-property policy", () => {
  const renderer = new SchemaRenderer(new Map());

  assert(
    renderer.render({ required: ["open"] }).includes('"open": unknown;'),
    "open required field was lost",
  );
  assert(
    renderer.render({
      type: "object",
      additionalProperties: { type: "string" },
      required: ["typed"],
    }).includes('"typed": string;'),
    "typed additional property did not constrain required field",
  );
  assert(
    renderer.render({
      type: "object",
      additionalProperties: false,
      required: ["forbidden"],
    }).includes('"forbidden": never;'),
    "closed impossible required field was weakened",
  );
});

Deno.test("oneOf and anyOf remain independent intersected constraints", () => {
  const renderer = new SchemaRenderer(new Map());

  assertEquals(
    renderer.render({
      oneOf: [{ const: "a" }, { const: "b" }],
      anyOf: [{ type: "string" }, { const: 1 }],
    }),
    '("a" | "b") & (1 | string)',
  );
});

Deno.test("incompatible known and typed additional properties fail explicitly", () => {
  const renderer = new SchemaRenderer(new Map());

  assertThrows(
    () =>
      renderer.render({
        type: "object",
        properties: { count: { type: "number" } },
        additionalProperties: { type: "string" },
      }),
    "count is incompatible with typed additionalProperties",
  );
  assert(
    renderer.render({
      type: "object",
      properties: { mode: { enum: ["read", "write"] } },
      additionalProperties: { type: "string" },
    }).includes("Record<string, string>"),
    "compatible typed additional properties were rejected",
  );
});

Deno.test("int64 integers use the lossless runtime type", () => {
  const renderer = new SchemaRenderer(new Map());

  assertEquals(renderer.render({ type: "integer", format: "int64" }), "RestInt64");
  assertEquals(renderer.render({ type: "integer", format: "int32" }), "number");
  assertEquals(renderer.render({ type: "integer" }), "RestInt64");
  assertEquals(renderer.render({ type: "number", format: "double" }), "RestJsonNumber");
});

Deno.test("unresolved and unsupported schema references fail instead of weakening to unknown", () => {
  const renderer = new SchemaRenderer(new Map());

  assertThrows(
    () => renderer.render({ $ref: "#/components/schemas/missing" }),
    "Unresolved component schema reference",
  );
  assertThrows(
    () => renderer.render({ $ref: "#/components/parameters/id" }),
    "Unsupported schema reference",
  );
});

Deno.test("write-only schema fields fail until response projection is explicit", () => {
  const renderer = new SchemaRenderer(new Map());
  assertThrows(
    () =>
      renderer.render({
        type: "object",
        properties: { secret: { type: "string", writeOnly: true } },
      }),
    "uses writeOnly",
  );
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function assertThrows(action: () => unknown, expected: string): void {
  try {
    action();
  } catch (error) {
    if (error instanceof Error && error.message.includes(expected)) return;
    throw error;
  }
  throw new Error(`Expected error containing ${JSON.stringify(expected)}`);
}
