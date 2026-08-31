# Code generation

The generator has two explicit owners:

```text
codegen/
├── generate.ts                 # runs both generators in dependency order
├── generation-runner.ts       # shared phase execution and progress output
├── workspace-layout.ts        # repository and package locations
├── pangit/
│   ├── pangit-generator.ts     # PanGit library pipeline
│   ├── specs/                 # provider/version source manifests and normalization
│   ├── generator/             # REST runtime, client, registry, and export generation
│   ├── tests/                  # provider E2E suite and sandbox inputs
│   ├── docker/                # generated provider sandboxes
└── pangit-site/
    ├── pangit-site-generator.ts # PanGit site pipeline
    ├── documentation/         # API catalog generation
    ├── static-assets.ts       # public reference and brand assets
    └── route-types.ts         # React Router type generation
```

Run both pipelines with `deno task generate`. Run them independently with
`deno task generate:pangit` or `deno task generate:pangit-site`. Pass `--cached` to the root or
PanGit command to reuse the checked-in provider specifications.

The PanGit generator owns `packages/pangit/src/providers/` and the generated suite files under
`tests/providers/`. It emits one REST-client implementation plus a barrel per provider/version, the
self-contained generated REST runtime, the lazy provider registry, and provider E2E assets.
Generated provider code never imports authored code outside `src/providers/`.

The PanGit site generator consumes the library manifests and owns generated documentation, public
reference assets, and route types under `packages/pangit-site/`. It does not regenerate the library.

Generation never starts Docker, reads E2E results, publishes result Markdown, or rewrites a README.
The authored runner at `tests/e2e-runner.ts` owns real-provider execution and deterministic result
publication through `deno task e2e`.
