import { useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { Link } from "react-router";
import { siteUrls } from "../urls.ts";
import { guideGroups, searchGuides } from "./catalog.ts";

export function GuideDirectory() {
  const [query, setQuery] = useState("");
  const matches = searchGuides(query);
  return (
    <section className="mt-10" aria-labelledby="fluent-guides">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="fluent-guides" className="text-xl font-semibold">Fluent API guides</h2>
        <label className="relative block w-full sm:w-64">
          <span className="sr-only">Find a guide</span>
          <Search size={15} className="pointer-events-none absolute top-3.5 left-3 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a guide…"
            className="field w-full pl-9 text-sm"
          />
        </label>
      </div>
      <p role="status" className="sr-only">
        {matches.length} {matches.length === 1 ? "guide" : "guides"} found
      </p>
      {guideGroups.map((group) => {
        const entries = matches.filter((guide) => guide.group === group);
        if (!entries.length) return null;
        return (
          <div key={group} className="mt-7">
            <h3 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
              {group}
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {entries.map((guide) => (
                <Link
                  key={guide.slug}
                  to={siteUrls.guide(guide.slug)}
                  className="group rounded-xl border border-line px-5 py-4 transition-colors hover:border-accent/50 hover:bg-panel"
                >
                  <span className="flex items-center justify-between gap-3 text-sm font-semibold">
                    {guide.title}
                    <ArrowUpRight
                      size={15}
                      className="shrink-0 text-muted group-hover:text-accent"
                    />
                  </span>
                  <p className="mt-2 text-sm leading-6 text-muted">{guide.summary}</p>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
      {!matches.length && (
        <p className="mt-6 rounded-xl border border-line p-6 text-sm text-muted">
          No matching guides. Try “files”, “OAuth”, or “GitLab”.
        </p>
      )}
    </section>
  );
}
