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
│   ├── media-type-generation/              # pinned MIME database + offline extension lookup
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
`deno task generate:pangit-site` run one owner. Add `--cached` to reuse the checked-in OpenAPI and
MIME database downloads, including their license evidence.

## What generation owns

```text
packages/pangit/src/generated-rest-clients/
packages/pangit/src/fluent-api/generated-media-types.ts
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

The MIME extension lookup is generated from the complete pinned `mime-db` database. Its source
version and database/license hashes live in `pangit/media-type-generation/generate-media-types.ts`;
update those reviewed pins together when upgrading the registry. The generated table has no runtime
dependencies, and its MIT license is included in the package notices. Do not add ad hoc extension
mappings to provider adapters or edit the generated lookup.
