import { IncompleteHistoryError } from "../../../fluent-api/adapter-contract/errors.ts";
import { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import { scanExclusiveHistory } from "./scan-history.ts";

for (const [count, cap] of [[51, 50], [51, 20], [60, 50]] as const) {
  Deno.test(`Forgejo history pagination preserves offsets at a 55-item budget (${count} commits, cap ${cap})`, async () => {
    const payloads = Array.from({ length: count }, (_, index) => ({
      sha: index.toString(16).padStart(40, "0"),
      commit: { message: `commit ${index}` },
      parents: [],
    }));
    let requests = 0;
    const context = new ForgejoAdapterContext("16.0.3", {
      baseUrl: "https://provider.invalid/api/v1",
      fetch(input, init) {
        const query = new URL(new Request(input, init).url).searchParams;
        const page = Number(query.get("page"));
        const limit = Math.min(cap, Number(query.get("limit")));
        requests++;
        return Promise.resolve(Response.json(payloads.slice((page - 1) * limit, page * limit), {
          headers: {
            "x-page": String(page),
            "x-perpage": String(limit),
            "x-total-count": String(count),
          },
        }));
      },
    });
    const budget = { remainingItems: 55, remainingRequests: 5, maximumRequests: 5 };
    try {
      const commits = await scanExclusiveHistory(
        context,
        {
          id: "1",
          owner: "acme",
          name: "project",
          fullName: "acme/project",
          native: {
            forgejo: (): Promise<never> => Promise.reject(new Error("Unexpected native access")),
          },
        },
        "left",
        "right",
        budget,
      );
      if (count > 55) throw new Error("Scan exceeded its history budget");
      if (commits.length !== count || new Set(commits.map((commit) => commit.sha)).size !== count) {
        throw new Error("History scan repeated or omitted commits");
      }
      if (requests !== Math.ceil(count / cap) || budget.remainingItems !== 55 - count) {
        throw new Error("History scan miscounted its budget");
      }
    } catch (error) {
      if (count <= 55 || !(error instanceof IncompleteHistoryError)) throw error;
    }
  });
}
