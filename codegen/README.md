# Code generation

The directory names state what each generator produces:

```text
codegen/
├── generate-all.ts                         # runs the two independent pipelines
├── generation-runner.ts                    # shared phase execution
├── workspace-layout.ts                     # repository and package locations
├── pangit/
│   ├── generate-pangit.ts                  # PanGit library pipeline
│   ├── generate-license-artifacts.ts        # root + package license evidence
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
THIRD_PARTY_NOTICES.md
packages/pangit/LICENSE
packages/pangit/THIRD_PARTY_NOTICES.md
tests/e2e/generated/raw-rest-client-tests/<git-host>/<version>/
tests/e2e/generated/docker-environments/<git-host>/<version>/
```

Generated raw-client tests import generated REST clients directly. Code generation does not start
Docker or touch runtime evidence under `tests/e2e/results/`.

Every active schema is pinned by a reviewed SHA-256 value in `git-hosts.json`. Configured license
and upstream-notice files are also downloaded, pinned, verified, emitted as client provenance, and
shipped in full. When a schema carries a configured license declaration, it is matched exactly and
preserved. Missing separate license evidence is recorded in the generated notices without removing
the supported client.
