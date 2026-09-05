/** Normalize Deno's generated HTML without changing coverage counts, source lines, or links. */
export function normalizeCoverageHtml(html: string): string {
  return html.replace(
    /^(\s*)at (?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), .*$/m,
    "$1from the real E2E run",
  ).replace(/[ \t]+$/gm, "");
}
