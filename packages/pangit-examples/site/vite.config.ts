import deno from "@deno/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const denoPlugins = deno().map((plugin) => {
  const resolve = plugin.resolveId;
  if (typeof resolve !== "function") return plugin;
  return {
    ...plugin,
    resolveId(
      this: ThisParameterType<typeof resolve>,
      ...args: Parameters<typeof resolve>
    ) {
      if (args[0].startsWith("\0") || args[0].startsWith("virtual:")) {
        return null;
      }
      return resolve.apply(this, args);
    },
  };
});

export default defineConfig({
  logLevel: "warn",
  plugins: [
    denoPlugins,
    tailwindcss(),
    reactRouter(),
    {
      name: "pangit-example-urls",
      configureServer(server) {
        server.httpServer?.once("listening", () => {
          setTimeout(() => {
            console.log([
              "",
              "PanGit examples ready:",
              "  Site:   http://127.0.0.1:5173",
              "  Gitea:  http://127.0.0.1:3300  (sandbox / gitea-sandbox-password)",
            ].join("\n"));
          }, 3_000);
        });
      },
    },
  ],
  server: { host: "127.0.0.1", port: 5173 },
});
