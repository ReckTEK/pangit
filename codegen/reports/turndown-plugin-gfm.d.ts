/** The upstream JavaScript package does not ship declarations. */
declare module "turndown-plugin-gfm/lib/turndown-plugin-gfm.es.js" {
  // @ts-types="npm:@types/turndown@5.0.6"
  import type TurndownService from "turndown";
  export function tables(service: TurndownService): void;
}
