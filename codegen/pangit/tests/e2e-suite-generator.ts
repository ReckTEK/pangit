import { generatedComment, markGenerated } from "../../generated-notices.ts";
import {
  providerClientArtifact,
  providerRuntimeArtifact,
  providerTestArtifacts,
} from "../provider-layout.ts";
import { generatedTestOwnershipMarker } from "./generated-test-tree.ts";
import { relativePath, workspace, type WorkspacePaths } from "../../workspace-layout.ts";
import { generateSandboxes } from "../docker/e2e-sandbox-generator.ts";
import type {
  E2EManifest,
  E2EStep,
  GeneratedE2EManifest,
  JsonRecord,
  SpecManifest,
} from "./e2e-manifest.ts";

/** Resolve a module import without assuming how deeply the generated suite is nested. */
function moduleSpecifier(from: URL, module: URL): string {
  const path = relativePath(from, module);
  return path.startsWith(".") ? path : `./${path}`;
}

/** Enforce the human-facing provider/version boundaries owned by the specification manifest. */
function assertArtifactLayout(
  provider: string,
  version: string,
  artifacts: SpecManifest["providers"][string]["versions"][string]["artifacts"],
): void {
  const tests = providerTestArtifacts(provider, version);
  const expected = {
    client: providerClientArtifact(provider, version),
    ...tests,
  };
  for (const name of ["client", "tests", "results", "compose"] as const) {
    if (artifacts[name] !== expected[name]) {
      throw new Error(
        `${provider} ${version}: ${name} artifact must be ${expected[name]}, got ${
          artifacts[name]
        }`,
      );
    }
  }
}

function resolve(document: JsonRecord, value: unknown): JsonRecord {
  const object = (value ?? {}) as JsonRecord;
  if (typeof object.$ref !== "string") return object;
  let target: unknown = document;
  for (const key of object.$ref.slice(2).split("/")) {
    target = (target as JsonRecord)[key.replaceAll("~1", "/").replaceAll("~0", "~")];
  }
  return resolve(document, target);
}

/** Generate provider/version E2E suites from normalized operations and declarative test maps. */
export async function generateClientTests(paths: WorkspacePaths = workspace): Promise<void> {
  const root = paths.root;
  const packageRoot = paths.packages.pangit;
  const templateDirectory = new URL("tests/templates/", paths.codegen.pangit);
  const manifest: SpecManifest = JSON.parse(
    await Deno.readTextFile(new URL("specs/raw/manifest.json", paths.codegen.pangit)),
  );
  for (const [provider, definition] of Object.entries(manifest.providers)) {
    if (!definition.testing) continue;
    const config: E2EManifest = JSON.parse(
      await Deno.readTextFile(new URL(definition.testing.manifest, paths.root)),
    );
    for (const [version, release] of Object.entries(definition.versions)) {
      assertArtifactLayout(provider, version, release.artifacts);
      const document = JSON.parse(
        await Deno.readTextFile(new URL(release.artifacts.normalized, paths.root)),
      );
      const clientFile = new URL(release.artifacts.client, packageRoot);
      const clientImplementation = new URL(`${definition.client.className}.ts`, clientFile);
      await Deno.stat(clientImplementation);
      const clientModule = await import(clientFile.href);
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
        client: relativePath(root, clientFile),
        clientImplementation: relativePath(root, clientImplementation),
        operations: operations.map(({ id, method, path, methodName }) => ({
          id,
          method,
          path,
          methodName,
        })),
        scenarios,
        negativeCases,
      };
      await Deno.writeTextFile(new URL(".generated", output), generatedTestOwnershipMarker);
      await Deno.writeTextFile(
        new URL("manifest.json", output),
        `${JSON.stringify(generated, null, 2)}\n`,
      );
      const test = `import { ${definition.client.className} } from ${
        JSON.stringify(moduleSpecifier(output, clientFile))
      };\nimport manifest from "./manifest.json" with { type: "json" };\nimport { runSuite } from "./runtime.ts";\nDeno.test(${
        JSON.stringify(`${provider} ${version} real API E2E`)
      }, async (t) => { await runSuite(t, manifest, ${definition.client.className}); });\n`;
      await Deno.writeTextFile(
        new URL("e2e_test.ts", output),
        markGenerated(test, "//"),
      );
      for (const template of ["deno.json", "runtime.ts", "run.ts"]) {
        let source = await Deno.readTextFile(new URL(`${template}.tpl`, templateDirectory));
        if (template === "runtime.ts") {
          const token = "__PANGIT_TRANSPORT_MODULE__";
          if (source.split(token).length !== 2) {
            throw new Error("Runtime template must contain exactly one transport module token");
          }
          source = source.replace(
            token,
            JSON.stringify(
              moduleSpecifier(output, new URL(providerRuntimeArtifact, packageRoot)),
            ),
          );
        }
        await Deno.writeTextFile(
          new URL(template, output),
          template.endsWith(".ts") ? markGenerated(source, "//") : source,
        );
      }
      await Deno.writeTextFile(
        new URL("e2e-manifest.ts", output),
        generatedComment("//") +
          await Deno.readTextFile(new URL("tests/e2e-manifest.ts", paths.codegen.pangit)),
      );
    }
  }
  await generateSandboxes(paths);
}
