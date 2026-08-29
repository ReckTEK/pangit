# Fluent API plan

## Client selection

The selected provider and version determine the generated REST implementation used internally.

```ts
const pangit = PanGit.createClient("gitea");
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

`authorize` is a common operation: it uses the selected provider adapter to run its OAuth protocol,
obtain a token, and produce an authorized REST client. OAuth routing is handled by one standard
Fetch callback handler, usable directly from Deno or through any Fetch-based framework.

## Boundary

Common operations define behavior PanGit guarantees across providers. Provider-only behavior is not
discarded or silently normalized; it is exposed through the fluent branch for that operation.
