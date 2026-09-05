import { siteUrls } from "../urls.ts";

/** Adding or removing a callable contract member must update its documentation. */
export type MethodDescriptions<T> = {
  [K in keyof T as T[K] extends (...args: never[]) => unknown ? K : never]: string;
};

/** A compact method index; the linked contract contains the full TypeScript signatures. */
export function MethodTable({ title, source, methods }: {
  title: string;
  source: string;
  methods: Readonly<Record<string, string>>;
}) {
  return (
    <div className="method-reference">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h3>{title}</h3>
        <a
          className="text-xs"
          href={siteUrls.source(`packages/pangit/src/${source}`)}
        >
          Types & signatures ↗
        </a>
      </div>
      <dl>
        {Object.entries(methods).map(([name, description]) => (
          <div key={name} className="border-b border-line px-4 py-3 last:border-0">
            <dt>
              <code>{name}()</code>
            </dt>
            <dd className="mt-1 text-sm leading-6 text-muted">{description}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
