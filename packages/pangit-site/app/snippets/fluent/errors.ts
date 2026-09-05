import type { Repository } from "@recktek/pangit/api";
declare const repo: Repository<"gitea", "1.27.2">;
// @example
import { errors } from "@recktek/pangit/api";

try {
  const text = await repo.content.readText("README.md", {
    signal: AbortSignal.timeout(10_000),
  });
  console.log(text);
} catch (error) {
  if (error instanceof errors.NotFoundError) {
    console.log("This repository has no README.md at the selected ref.");
  } else {
    throw error;
  }
}
