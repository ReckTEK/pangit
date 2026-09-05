import { runAuthenticationContract } from "../../contracts/authentication/authentication-contract.ts";
import { ForgejoAuthenticationFixtureDriver } from "../../authentication/ForgejoAuthenticationFixtureDriver.ts";
import type { ForgejoContractCatalogEntry } from "../context.ts";
export const runCoreAuthentication: ForgejoContractCatalogEntry["run"] = async (t, context) => {
  const authenticationFixtures = await ForgejoAuthenticationFixtureDriver.create({
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    timeoutMs: context.timeoutMs,
  });
  try {
    const fixtures = await authenticationFixtures.createFixtures({
      username: context.username,
      password: context.password,
      webBaseUrl: context.webBaseUrl,
    });
    return await runAuthenticationContract(t, {
      provider: "forgejo",
      version: context.version,
      apiUrl: context.apiUrl,
      webBaseUrl: context.webBaseUrl,
      token: context.token,
      fixtures,
    });
  } finally {
    await authenticationFixtures.cleanup();
  }
};
