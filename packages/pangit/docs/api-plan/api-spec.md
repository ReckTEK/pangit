# Fluent API plan

## Client selection

The selected provider and version determine the generated REST implementation used internally.

```ts
const pangit = PanGit.createClient("gitea", "1.27.2", {
  baseUrl: "https://git.example.com/api/v1",
});
```

PanGit presents the same common API regardless of that selection.

## Common core plus native branches

Each public operation begins with its common input and can then declare selected-provider-only work.

```ts
pangit.tags.create({ name, target, message })
  .github((tag) => {
    // GitHub tag-only behavior
  })
  .codeberg((tag) => {
    // Codeberg tag-only behavior
  });
```

All provider branches are available to declare. At execution time PanGit runs only the branch for
the configured provider. The callback context is specific to the operation: tag branches expose tag
capabilities, pull-request branches expose pull-request capabilities, and never a generic provider
context.

## Authorization

`login` begins the selected provider's OAuth hop. A universal `OAuthHandler` registers those
selected logins, starts one by provider, and accepts the native callback `Request` plus its retained
transaction. It routes by the callback's `type`, validates state, runs the selected provider
adapter, and returns the authorized result. Browser, server, and CLI examples use this same API;
only their short-lived transaction storage differs.

## Boundary

Common operations define behavior PanGit guarantees across providers. Provider-only behavior is not
discarded or silently normalized; it is exposed through the fluent branch for that operation.
