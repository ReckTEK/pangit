import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { siteUrls } from "../urls.ts";
import { findGuide, guides, type GuideSlug } from "./catalog.ts";

export interface GuideSection {
  id: string;
  title: string;
  content: ReactNode;
}

export function guideMeta(slug: GuideSlug) {
  const guide = findGuide(slug);
  return () => [
    { title: `${guide.title} — PanGit` },
    { name: "description", content: guide.summary },
  ];
}

export function GuideLink({ to, children }: { to: GuideSlug; children: ReactNode }) {
  return <Link to={siteUrls.guide(to)}>{children}</Link>;
}

export function SourceLink({ path, children }: { path: string; children: ReactNode }) {
  return <a href={siteUrls.source(path)}>{children}</a>;
}

export function Note({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="guide-note">
      <strong>{title}</strong>
      <div>{children}</div>
    </aside>
  );
}

/** Sections define the article and its table of contents together. */
export function GuidePage(
  { slug, sections }: { slug: GuideSlug; sections: readonly GuideSection[] },
) {
  const guide = findGuide(slug);
  const index = guides.findIndex((entry) => entry.slug === slug);
  const previous = guides[index - 1];
  const next = guides[index + 1];
  return (
    <div className="grid min-w-0 gap-10 xl:grid-cols-[minmax(0,1fr)_175px] xl:gap-12">
      <article className="min-w-0 max-w-[76ch]">
        <header className="mb-10 border-b border-line pb-8">
          <p className="eyebrow">FLUENT API / {guide.group.toUpperCase()}</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-[2.75rem]">
            {guide.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted">{guide.summary}</p>
        </header>
        <nav aria-label="On this page" className="mb-9 rounded-xl border border-line p-4 xl:hidden">
          <p className="eyebrow mb-3">ON THIS PAGE</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
            {sections.map((section) => (
              <li key={section.id}>
                <a className="hover:text-accent" href={`#${section.id}`}>{section.title}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="guide-prose">
          {sections.map((section) => (
            <section key={section.id} aria-labelledby={section.id}>
              <h2 id={section.id}>
                <a href={`#${section.id}`}>{section.title}</a>
              </h2>
              {section.content}
            </section>
          ))}
        </div>
        <nav
          aria-label="Continue reading"
          className="mt-14 grid gap-4 border-t border-line pt-6 sm:grid-cols-2"
        >
          {previous
            ? (
              <Link className="reading-link" to={siteUrls.guide(previous.slug)}>
                <span>
                  <ArrowLeft size={14} />Previous
                </span>
                {previous.title}
              </Link>
            )
            : <span />}
          {next && (
            <Link className="reading-link sm:text-right" to={siteUrls.guide(next.slug)}>
              <span className="sm:justify-end">
                Next<ArrowRight size={14} />
              </span>
              {next.title}
            </Link>
          )}
        </nav>
        <a
          className="mt-8 inline-block text-xs text-muted hover:text-accent"
          href={siteUrls.source(`packages/pangit-site/app/guides/pages/${slug}.tsx`)}
        >
          View this guide's source ↗
        </a>
      </article>
      <aside className="hidden xl:block">
        <nav aria-label="On this page" className="sticky top-26 border-l border-line pl-5">
          <p className="eyebrow mb-4">ON THIS PAGE</p>
          <ul className="space-y-3 text-xs leading-5 text-muted">
            {sections.map((section) => (
              <li key={section.id}>
                <a className="hover:text-accent" href={`#${section.id}`}>{section.title}</a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </div>
  );
}
