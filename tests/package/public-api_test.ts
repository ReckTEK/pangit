import * as PanGit from "@mannsion/pangit";
import * as api from "@mannsion/pangit/api";
import { GiteaRestClient } from "@mannsion/pangit/providers/gitea/1.27.2";

const packageRoot = new URL("../../packages/pangit/", import.meta.url);

function assertEquals(actual: unknown, expected: unknown, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  }
}

Deno.test("package root exposes only the fluent API and provider-client factory", () => {
  assertEquals(Object.keys(PanGit), ["api", "createProviderClient"], "Unexpected root export");
  assertEquals(
    Object.keys(PanGit.api),
    ["auth", "createClient"],
    "Unexpected API export",
  );
  assertEquals(
    Object.keys(PanGit.api.auth),
    [
      "AuthAdapterNotImplementedError",
      "OAuthCallbackError",
      "createOAuthCookieFlow",
      "createOAuthHandler",
      "createOAuthTransactionCookie",
    ],
    "Unexpected API-auth export",
  );
  assertEquals(PanGit.api, api, "Root API door differs from its direct module");
});

Deno.test("package subpaths expose only the API and individual provider clients", async () => {
  const configuration = JSON.parse(await Deno.readTextFile(new URL("deno.json", packageRoot)));
  const expected = [
    ".",
    "./api",
    "./providers/azure-devops/latest",
    "./providers/bitbucket/latest",
    "./providers/codeberg/latest",
    "./providers/gitea/1.26.4",
    "./providers/gitea/1.27.2",
    "./providers/github/latest",
    "./providers/gitlab/18.11.11",
    "./providers/gitlab/19.3.1",
  ];
  assertEquals(Object.keys(configuration.exports), expected, "Unexpected package export path");
  for (const [specifier, target] of Object.entries(configuration.exports)) {
    if (typeof target !== "string" || !target.startsWith("./src/")) {
      throw new Error(`Package export escapes src: ${specifier} -> ${String(target)}`);
    }
  }
  assertEquals(
    GiteaRestClient.name,
    "GiteaRestClient",
    "Provider-client subpath resolved incorrectly",
  );
});

Deno.test("the API owns fluent types while provider client types stay inferred", async () => {
  const version = "1.27.2" as const;
  const client: PanGit.api.FluentClient<"gitea", typeof version> = PanGit.api
    .createClient("gitea", version, {
      baseUrl: "https://git.example.com/api/v1",
    });
  const login: PanGit.api.auth.Login<"gitea", typeof version> = client.auth.login({
    clientId: "public-api-test",
    callbackUrl: "https://example.com/callback",
  });
  const providerClient = await PanGit.createProviderClient(
    "gitea",
    version,
    "https://git.example.com/api/v1",
  );
  const configuredProviderClient = await PanGit.createProviderClient("gitea", version, {
    baseUrl: "https://git.example.com/api/v1",
  });
  assertEquals(
    [
      client.provider,
      client.version,
      login.provider,
      login.version,
      providerClient.constructor.name,
      configuredProviderClient.constructor.name,
    ],
    ["gitea", version, "gitea", version, GiteaRestClient.name, GiteaRestClient.name],
    "Public factories lost provider/version selection",
  );
});
