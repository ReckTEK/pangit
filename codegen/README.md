# Code generation

The directory names state what each generator produces:

```text
codegen/
├── generate-all.ts                         # runs the two independent pipelines
├── generation-runner.ts                    # shared phase execution
├── workspace-layout.ts                     # repository and package locations
├── pangit/
│   ├── generate-pangit.ts                  # PanGit library pipeline
│   ├── raw-rest-client-generation/
│   │   ├── openapi-specifications/         # sources, downloads, normalization
│   │   ├── generated-runtime-template/     # copied into generated client output
│   │   ├── generate-rest-clients.ts
│   │   └── publish-generated-rest-clients.ts
│   └── e2e-test-generation/
│       ├── generate-e2e-test-assets.ts     # generated raw tests + Docker only
│       ├── clean-generated-e2e-output.ts
│       ├── raw-rest-client-tests/
│       └── docker-test-environments/
└── pangit-site/                            # documentation-site pipeline
```

`deno task generate` runs both pipelines. `deno task generate:pangit` and
`deno task generate:pangit-site` run one owner. Add `--cached` to reuse the checked-in OpenAPI
downloads.

## What generation owns

```text
packages/pangit/src/generated-rest-clients/
tests/e2e/generated/raw-rest-client-tests/<git-host>/<version>/
tests/e2e/generated/docker-environments/<git-host>/<version>/
```

The generated raw test imports a generated REST client directly. The generated Docker environment
joins that raw test with a path to an existing hand-written fluent API test. Generation never writes
the hand-written test tree:

```text
tests/e2e/hand-written/
├── raw-rest-client-test-cases/
├── fluent-api-contracts/
├── git-host-adapter-tests/
├── docker-environment-definitions/
└── live-test-plan.json
```

`deno task e2e` is a separate command. It discovers the generated Docker runs, executes both test
kinds, writes suite-separated evidence under `tests/e2e/results/`, and publishes Markdown reports.
Code generation does not start Docker or touch runtime evidence.
