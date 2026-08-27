import { generateSandboxes } from "../docker/generate.ts";
import type {
  E2EManifest,
  E2EStep,
  GeneratedE2EManifest,
  JsonRecord,
  SpecManifest,
} from "./model.ts";

const root = new URL("../../", import.meta.url);
const templateDirectory = new URL("./templates/", import.meta.url);

function resolve(document: JsonRecord, value: unknown): JsonRecord {
  const object = (value ?? {}) as JsonRecord;
  if (typeof object.$ref !== "string") return object;
  let target: unknown = document;
  for (const key of object.$ref.slice(2).split("/")) {
    target = (target as JsonRecord)[key.replaceAll("~1", "/").replaceAll("~0", "~")];
  }
  return resolve(document, target);
}

export async function generateClientTests(): Promise<void> {
  const manifest: SpecManifest = JSON.parse(
    await Deno.readTextFile(new URL("codegen/specs/raw/manifest.json", root)),
  );
  for (const [provider, definition] of Object.entries(manifest.providers)) {
    if (!definition.testing) continue;
    const config: E2EManifest = JSON.parse(
      await Deno.readTextFile(new URL(definition.testing.manifest, root)),
    );
    for (const [version, release] of Object.entries(definition.versions)) {
      const document = JSON.parse(
        await Deno.readTextFile(new URL(release.artifacts.normalized, root)),
      );
      const clientModule = await import(new URL(release.artifacts.client, root).href);
      const registry = clientModule[`${definition.client.variablePrefix}Operations`] as Record<
        string,
        { id: string; method: string; path: string }
      >;
      const operations = Object.entries(registry).map(([methodName, operation]) => ({
        ...operation,
        methodName,
      }));
      const byId = new Map(operations.map((operation) => [operation.id, operation]));
      const specOperations = new Map<
        string,
        { parameters: JsonRecord[]; requestBody: JsonRecord }
      >();
      for (const item of Object.values(document.paths) as JsonRecord[]) {
        for (const operation of Object.values(item) as JsonRecord[]) {
          if (typeof operation.operationId !== "string") continue;
          specOperations.set(operation.operationId, {
            parameters: [
              ...(item.parameters as JsonRecord[] ?? []),
              ...(operation.parameters as JsonRecord[] ?? []),
            ].map((p) => resolve(document, p)),
            requestBody: resolve(document, operation.requestBody),
          });
        }
      }
      if (
        JSON.stringify([...byId.keys()].sort()) !==
          JSON.stringify([...specOperations.keys()].sort())
      ) throw new Error(`${provider} ${version}: client and spec operations differ`);
      const covered = new Set<string>();
      const prepare = (step: E2EStep): E2EStep[] => {
        if (step.fixture) {
          if (!step.operationId.startsWith("$fixture/") || byId.has(step.operationId)) {
            throw new Error("Fixture requests must be explicitly separate from spec operations");
          }
          return [step];
        }
        if (!byId.has(step.operationId)) {
          if (step.optional) return [];
          throw new Error(`${provider} ${version}: unknown test operation ${step.operationId}`);
        }
        const input = structuredClone(step.input ?? {});
        const path = { ...(input.path as JsonRecord ?? {}) };
        for (const parameter of specOperations.get(step.operationId)!.parameters) {
          if (parameter.in !== "path") continue;
          const name = parameter.name as string;
          if (!(name in path)) {
            if (!(name in config.parameterDefaults)) {
              throw new Error(`${step.operationId}: no manifest value for path parameter ${name}`);
            }
            path[name] = config.parameterDefaults[name];
          }
        }
        if (Object.keys(path).length) input.path = path;
        if (!step.expect.status.length) {
          throw new Error(`${step.operationId}: no explicit expected status`);
        }
        if (step.poll && byId.get(step.operationId)!.method.toUpperCase() !== "GET") {
          throw new Error(`${step.operationId}: polling is only permitted for read operations`);
        }
        covered.add(step.operationId);
        return [{ ...step, input }];
      };
      const scenarios = config.scenarios.map((scenario) => ({
        ...scenario,
        steps: scenario.steps.flatMap(prepare),
      }));
      const negativeCases = config.negativeCases.flatMap(prepare);
      const missing = [...byId.keys()].filter((id) => !covered.has(id));
      if (missing.length) {
        throw new Error(
          `${provider} ${version}: missing real E2E cases (${missing.length}): ${
            missing.join(", ")
          }`,
        );
      }
      const output = new URL(`${release.artifacts.tests}/`, root);
      await Deno.mkdir(output, { recursive: true });
      const generated: GeneratedE2EManifest = {
        ...config,
        provider,
        version,
        image: release.containerImage!,
        client: release.artifacts.client,
        operations: operations.map(({ id, method, path, methodName }) => ({
          id,
          method,
          path,
          methodName,
        })),
        scenarios,
        negativeCases,
      };
      await Deno.writeTextFile(
        new URL("manifest.json", output),
        `${JSON.stringify(generated, null, 2)}\n`,
      );
      const test =
        `// Generated real HTTP E2E suite. Do not edit.\nimport { ${definition.client.className} } from "../client.ts";\nimport manifest from "./manifest.json" with { type: "json" };\nimport { runSuite } from "./runtime.ts";\nDeno.test(${
          JSON.stringify(`${provider} ${version} real API E2E`)
        }, async (t) => { await runSuite(t, manifest, ${definition.client.className}); });\n`;
      await Deno.writeTextFile(new URL("e2e_test.ts", output), test);
      for (const template of ["runtime.ts", "run.ts"]) {
        const source = await Deno.readTextFile(new URL(`${template}.tpl`, templateDirectory));
        await Deno.writeTextFile(new URL(template, output), source);
      }
      await Deno.writeTextFile(
        new URL("model.ts", output),
        await Deno.readTextFile(new URL("./model.ts", import.meta.url)),
      );
      console.log(
        `${provider} ${version}: ${operations.length} real endpoint tests -> ${release.artifacts.tests}`,
      );
    }
  }
  await generateSandboxes();
}

if (import.meta.main) await generateClientTests();
