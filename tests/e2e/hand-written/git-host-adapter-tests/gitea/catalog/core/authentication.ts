import { runAuthenticationContract } from "../../contracts/authentication/authentication-contract.ts";
import { GiteaAuthenticationFixtureDriver } from "../../authentication/GiteaAuthenticationFixtureDriver.ts";
import type { GiteaContractCatalogEntry } from "../context.ts";
export const runCoreAuthentication: GiteaContractCatalogEntry["run"] = async (t, context) => {
  const authenticationFixtures = await GiteaAuthenticationFixtureDriver.create({
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
      provider: "gitea",
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
