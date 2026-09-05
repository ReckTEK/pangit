import type { Repository } from "@recktek/pangit/api";
declare const repo: Repository<"gitea", "1.27.2">;
// @example
const text = await repo.content.readText("README.md", { ref: "main" });
const bytes = await repo.content.readBytes("assets/logo.png", { ref: "main" });
const config = await repo.content.readJson("config.json", { ref: "main" });
// config is unknown. Validate its shape before using application fields.
console.log(text, bytes.byteLength, config);

const paths = await repo.content.listDirectory("src", {
  ref: "main",
  recursive: true,
  maxDepth: 3,
  maxItems: 200,
});
console.log(paths.map((entry) => entry.path));
