import { ChevronRight, Library } from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useParams } from "react-router";
import { documentation } from "../lib.ts";
import { siteConfig } from "../../site.config.ts";
import { isWithinPath, siteUrls } from "../urls.ts";
import { guideGroups, guides } from "../guides/catalog.ts";

function Sidebar() {
  const location = useLocation();
  return (
    <nav aria-label="Documentation navigation" className="space-y-8">
      <div className="space-y-1">
        <NavLink
          end
          to={siteUrls.docs}
          className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
        >
          <Library size={16} />Overview
        </NavLink>
      </div>
      {guideGroups.map((group) => (
        <div key={group}>
          <p className="mb-2 px-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">
            {group}
          </p>
          <div className="space-y-0.5">
            {guides.filter((guide) => guide.group === group).map((guide) => (
              <NavLink
                key={guide.slug}
                to={siteUrls.guide(guide.slug)}
                className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
              >
                {guide.title}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
      <div>
        <p className="mb-3 px-3 font-mono text-[10px] font-semibold tracking-[0.13em] text-muted">
          RAW REST CLIENTS
        </p>
        <div className="space-y-1">
          {documentation.providers.map((provider) => (
            <Link
              key={provider.id}
              to={siteUrls.reference(provider.id, provider.selected)}
              className={`sidebar-link justify-between ${
                isWithinPath(location.pathname, siteUrls.provider(provider.id)) ? "active" : ""
              }`}
            >
              <span>{provider.name}</span>
              <span className="font-mono text-[10px] opacity-60">{provider.versions.length}</span>
            </Link>
          ))}
        </div>
      </div>
      <div className="mx-3 rounded-xl border border-line bg-paper p-4">
        <span className="font-mono text-[10px] text-accent">FROM SPEC TO SOURCE</span>
        <p className="mt-2 text-xs leading-6 text-muted">
          References are generated from the same specifications as the clients.
        </p>
      </div>
    </nav>
  );
}

export default function DocsLayout() {
  const params = useParams();
  const location = useLocation();
  const provider = documentation.providers.find((entry) => entry.id === params.provider);
  const guide = guides.find((entry) => siteUrls.guide(entry.slug) === location.pathname);
  const explorer = provider && params.version &&
    location.pathname === siteUrls.reference(provider.id, params.version);
  return (
    <div
      className={`mx-auto min-h-[calc(100vh-150px)] max-w-[1600px] ${
        explorer ? "" : "lg:grid lg:grid-cols-[260px_minmax(0,1fr)]"
      }`}
    >
      {!explorer && (
        <aside className="hidden border-r border-line bg-panel/60 lg:block">
          <div className="sticky top-18 max-h-[calc(100vh-72px)] overflow-y-auto px-5 py-9">
            <Sidebar />
          </div>
        </aside>
      )}
      <div className="min-w-0">
        <details
          key={location.pathname}
          className="border-b border-line bg-panel px-5 py-4 lg:hidden"
        >
          <summary className="cursor-pointer text-sm font-medium">Documentation menu</summary>
          <div className="pt-6">
            <Sidebar />
          </div>
        </details>
        <div className="flex min-h-15 flex-wrap items-center gap-2 border-b border-line px-5 py-3 text-xs text-muted sm:px-10">
          <Link to={siteUrls.docs} className="hover:text-accent">Docs</Link>
          {guide && (
            <>
              <ChevronRight size={12} />
              <span>Fluent API</span>
              <ChevronRight size={12} />
              <span className="text-ink">{guide.title}</span>
            </>
          )}
          {provider && (
            <>
              <ChevronRight size={12} />
              <span>{provider.name}</span>
              <ChevronRight size={12} />
              <span className="font-mono text-ink">{params.version}</span>
            </>
          )}
          <span className="ml-auto hidden font-mono text-[10px] sm:inline">
            {siteConfig.packageName}
          </span>
        </div>
        <main
          id={siteConfig.anchors.main}
          className={`mx-auto pt-9 pb-20 lg:pt-11 ${
            explorer ? "min-w-0" : "max-w-[1300px] px-5 sm:px-10"
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
