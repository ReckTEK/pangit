import { loadDocumentationGuide } from "@mannsion/pangit/documentation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link, type LoaderFunctionArgs, type MetaFunction, useLoaderData } from "react-router";
import { ArrowDownToLine, BookOpen } from "lucide-react";
import { guideLink } from "../lib.ts";
import { siteConfig } from "../../site.config.ts";
import { isWithinPath, siteUrls } from "../urls.ts";

export async function loader({ params }: LoaderFunctionArgs) {
  const guide = await loadDocumentationGuide(params["*"]?.replace(/\/$/, "") ?? "");
  if (!guide) throw new Response("Tutorial not found", { status: 404 });
  return { guide };
}

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [{
  title: `${loaderData?.guide.title ?? "Tutorials"} — ${siteConfig.name}`,
}];

export default function Guide() {
  const { guide } = useLoaderData<typeof loader>();
  return (
    <div className="max-w-4xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <p className="eyebrow flex items-center gap-2">
          <BookOpen size={15} />HANDWRITTEN TUTORIALS
        </p>
        <a href={siteUrls.example(guide.source)} download className="text-link text-xs">
          <ArrowDownToLine size={14} />Markdown source
        </a>
      </div>
      <article className="guide-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a({ href = "", children }) {
              const target = guideLink(guide.source, href);
              return isWithinPath(target, siteUrls.docs) ? <Link to={target}>{children}</Link> : (
                <a
                  href={target}
                  {...(isWithinPath(target, siteConfig.assets.examples.path)
                    ? { download: true }
                    : {})}
                >
                  {children}
                </a>
              );
            },
            table({ children }) {
              return (
                <div className="overflow-x-auto">
                  <table>{children}</table>
                </div>
              );
            },
          }}
        >
          {guide.markdown}
        </ReactMarkdown>
      </article>
    </div>
  );
}
