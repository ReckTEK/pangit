import type { ProviderExtensionOptions, RegisteredOperation } from "./ProviderExtensionRegistry.ts";
import type { ValidationErrorContext } from "../adapter-contract/errors.ts";

/** Availability and validation owned by one provider operation. */
export interface ExtensionSupport<Options extends object = object> {
  readonly versions: "all" | readonly string[];
  readonly validate?: (options: Readonly<Options>, context: ValidationErrorContext) => void;
}

export type ProviderExtensions<P extends string> = Readonly<
  Partial<
    {
      [O in RegisteredOperation]: ExtensionSupport<ProviderExtensionOptions<O, P>>;
    }
  >
>;

export function supportsExtension(
  support: Pick<ExtensionSupport, "versions"> | undefined,
  version: string,
): boolean {
  return support !== undefined &&
    (support.versions === "all" || support.versions.includes(version));
}
