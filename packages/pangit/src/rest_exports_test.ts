// Kept separate so a fresh, permission-free test process can exercise both public entries.
Deno.test("public REST entries share the supported runtime exports", async () => {
  const rest = await import("@mannsion/pangit/rest");
  const root = await import("@mannsion/pangit");
  const names = [
    "RestApiError",
    "RestClient",
    "RestParseError",
    "RestTransportError",
    "RestUndocumentedResponseError",
    "deepFreezeRestMetadata",
    "deepFreezeRestOperations",
    "isRestDocumentedSuccess",
    "isRestSuccess",
    "unwrapRestResponse",
  ] as const;

  if (Object.keys(rest).sort().join(",") !== names.join(",")) {
    throw new Error("The public REST entry changed its runtime exports");
  }
  for (const name of names) {
    if (root[name] !== rest[name]) {
      throw new Error(`Root and REST entries disagree on ${name}`);
    }
  }

  const client = new root.RestClient({ baseUrl: "https://example.test/api" });
  if (!(client instanceof rest.RestClient) || client.baseUrl.href !== "https://example.test/api") {
    throw new Error("Public entries must expose the same usable transport constructor");
  }
});
