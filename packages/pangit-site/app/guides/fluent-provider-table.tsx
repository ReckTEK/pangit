import type { FluentProvider } from "@recktek/pangit/api";
import { documentation } from "../lib.ts";

const owners = {
  gitea: "User or organization",
  forgejo: "User or organization",
  gitlab: "User namespace or nested group",
} satisfies Record<FluentProvider, string>;

/** Use the generated version inventory rather than repeating versions in prose. */
export function FluentProviderTable() {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Fluent provider</th>
            <th>API versions</th>
            <th>Owner vocabulary</th>
          </tr>
        </thead>
        <tbody>
          {(Object.keys(owners) as FluentProvider[]).map((id) => {
            const provider = documentation.providers.find((entry) => entry.id === id)!;
            return (
              <tr key={id}>
                <td>{provider.name}</td>
                <td>{provider.versions.map((version) => version.version).join(" · ")}</td>
                <td>{owners[id]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
