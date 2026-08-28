import { ArrowRight, Layers3 } from "lucide-react";
import { Link } from "react-router";
import { siteConfig } from "../../site.config.ts";
import { siteUrls } from "../urls.ts";

export const meta = () => [{ title: `High-level API — Planned — ${siteConfig.name}` }];

export default function Unified() {
  return (
    <section className="max-w-2xl py-12">
      <Layers3 size={30} className="text-accent" />
      <p className="eyebrow mt-8">HIGH-LEVEL API / NOT IMPLEMENTED</p>
      <h1 className="mt-5 text-4xl font-semibold tracking-tight">Room for a unified API.</h1>
      <p className="mt-5 text-base leading-8 text-muted">
        This section is reserved for the future abstraction above PanGit’s provider-native clients.
        There is no unified client or OpenAPI contract here yet.
      </p>
      <p className="mt-4 text-sm leading-7 text-muted">
        The raw REST documentation is ready to explore. Compare the providers’ actual operations and
        schemas while designing the shared API.
      </p>
      <Link to={siteUrls.docs} className="button-primary mt-8">
        Explore raw REST clients <ArrowRight size={16} />
      </Link>
    </section>
  );
}
