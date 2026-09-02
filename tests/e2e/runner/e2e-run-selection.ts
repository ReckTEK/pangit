/** Live E2E suites that can be selected from the command line. */
export const e2eSuites = ["raw", "fluent", "all"] as const;

export type E2ESuite = (typeof e2eSuites)[number];

/** Stable versions and fluent contract IDs available for one Git host. */
export type E2EHostCatalog = {
  readonly versions: readonly string[];
  readonly fluentContractIds: readonly string[];
};

export type E2ERunCatalog = Readonly<Record<string, E2EHostCatalog>>;

/** Validated selection used by the host runner and passed into Docker. */
export type E2ERunSelection = {
  readonly gitHost?: string;
  readonly version?: string;
  readonly suite: E2ESuite;
  readonly contract?: string;
  /** Any CLI selector makes this a non-publishing focused run. */
  readonly focused: boolean;
};

type MutableSelection = {
  gitHost?: string;
  version?: string;
  suite?: E2ESuite;
  contract?: string;
};

const optionNames = ["git-host", "version", "suite", "contract"] as const;
type OptionName = (typeof optionNames)[number];

function isOptionName(value: string): value is OptionName {
  return (optionNames as readonly string[]).includes(value);
}

function readArguments(args: readonly string[]): MutableSelection {
  const found: MutableSelection = {};
  const assigned = new Set<OptionName>();

  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (!argument.startsWith("--")) {
      throw new TypeError(`Unexpected E2E argument: ${argument}`);
    }
    const equals = argument.indexOf("=");
    const name = argument.slice(2, equals === -1 ? undefined : equals);
    if (!isOptionName(name)) throw new TypeError(`Unknown E2E option: --${name}`);
    if (assigned.has(name)) throw new TypeError(`Duplicate E2E option: --${name}`);

    const value = equals === -1 ? args[++index] : argument.slice(equals + 1);
    if (value === undefined || value.length === 0 || value.startsWith("--")) {
      throw new TypeError(`E2E option --${name} requires a value`);
    }
    assigned.add(name);
    if (name === "git-host") found.gitHost = value;
    else if (name === "version") found.version = value;
    else if (name === "contract") found.contract = value;
    else {
      if (!(e2eSuites as readonly string[]).includes(value)) {
        throw new TypeError(`Unknown E2E suite: ${value}`);
      }
      found.suite = value as E2ESuite;
    }
  }

  return found;
}

/** Parse and fully validate E2E filters without starting Docker. */
export function parseE2ERunSelection(
  args: readonly string[],
  catalog: E2ERunCatalog,
): E2ERunSelection {
  const input = readArguments(args);
  const knownHosts = Object.keys(catalog);
  if (knownHosts.length === 0) throw new Error("The live E2E catalog has no Git hosts");
  if (input.gitHost !== undefined && catalog[input.gitHost] === undefined) {
    throw new TypeError(`Unknown E2E Git host: ${input.gitHost}`);
  }

  const selectedHosts = input.gitHost === undefined ? knownHosts : [input.gitHost];
  if (
    input.version !== undefined &&
    !selectedHosts.some((gitHost) => catalog[gitHost].versions.includes(input.version!))
  ) {
    throw new TypeError(
      `Unknown E2E version${
        input.gitHost === undefined ? "" : ` for ${input.gitHost}`
      }: ${input.version}`,
    );
  }

  const suite = input.suite ?? (input.contract === undefined ? "all" : "fluent");
  if (input.contract !== undefined && suite !== "fluent") {
    throw new TypeError("--contract can only be used with --suite fluent");
  }
  if (suite === "fluent") {
    const withoutFluentSuite = selectedHosts.filter((gitHost) =>
      catalog[gitHost].fluentContractIds.length === 0
    );
    if (withoutFluentSuite.length > 0) {
      throw new TypeError(`No fluent E2E suite for: ${withoutFluentSuite.join(", ")}`);
    }
  }
  if (input.contract !== undefined) {
    const withoutContract = selectedHosts.filter((gitHost) =>
      !catalog[gitHost].fluentContractIds.includes(input.contract!)
    );
    if (withoutContract.length > 0) {
      throw new TypeError(
        `Unknown fluent E2E contract for ${withoutContract.join(", ")}: ${input.contract}`,
      );
    }
  }

  return Object.freeze({
    ...(input.gitHost === undefined ? {} : { gitHost: input.gitHost }),
    ...(input.version === undefined ? {} : { version: input.version }),
    suite,
    ...(input.contract === undefined ? {} : { contract: input.contract }),
    focused: args.length > 0,
  });
}

/** Select only releases named by a validated CLI selection. */
export function filterE2EReleases<
  TRelease extends { readonly gitHost: string; readonly version: string },
>(
  releases: readonly TRelease[],
  selection: E2ERunSelection,
): readonly TRelease[] {
  const selected = releases.filter((release) =>
    (selection.gitHost === undefined || release.gitHost === selection.gitHost) &&
    (selection.version === undefined || release.version === selection.version)
  );
  if (selected.length === 0) throw new TypeError("E2E filters selected no generated releases");
  return selected;
}

/** Whether one Docker-side runner selection includes the generated raw suite. */
export function includesRawSuite(suite: E2ESuite): boolean {
  return suite === "raw" || suite === "all";
}

/** Whether one Docker-side runner selection includes the hand-written fluent suite. */
export function includesFluentSuite(suite: E2ESuite): boolean {
  return suite === "fluent" || suite === "all";
}

/** Keep focused evidence outside the complete, publishable result tree. */
export function resolveE2EResultDirectory(
  root: URL,
  release: { readonly gitHost: string; readonly version: string; readonly results: URL },
  selection: E2ERunSelection,
): URL {
  return selection.focused
    ? new URL(`tests/e2e/.focused-results/${release.gitHost}/${release.version}/`, root)
    : release.results;
}

/** Only the argument-free complete run may replace published E2E documentation. */
export function shouldPublishE2EResults(selection: E2ERunSelection): boolean {
  return !selection.focused;
}
