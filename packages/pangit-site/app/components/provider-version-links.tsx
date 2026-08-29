import type { DocumentationProvider } from "../documentation/model.ts";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { siteUrls } from "../urls.ts";

export function ProviderVersionLinks({ provider, variant }: {
  provider: DocumentationProvider;
  variant: "table" | "card";
}) {
  const versions = variant === "card" ? provider.versions.toReversed() : provider.versions;
  return (
    <div className={variant === "card" ? "mt-5 flex flex-wrap gap-2" : "flex flex-wrap gap-2"}>
      {versions.map((version) => (
        <Link
          key={version.version}
          to={siteUrls.reference(provider.id, version.version)}
          className={variant === "card"
            ? `version-link ${version.version === provider.selected ? "current" : ""}`
            : "version-link"}
          aria-label={variant === "table"
            ? `${provider.name} ${version.version} API reference`
            : undefined}
        >
          {version.version}
          {variant === "card" && <ArrowRight size={12} />}
        </Link>
      ))}
    </div>
  );
}
