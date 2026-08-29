import deno from "@deno/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// @deno/vite-plugin 2.0.3 can pass HMR virtual IDs into Deno's module loader during
// dependency optimization. Leave Vite's virtual modules to the plugin that owns them.
const denoPlugins = deno().map((plugin) => {
  const resolve = plugin.resolveId;
  if (typeof resolve !== "function") return plugin;
  return {
    ...plugin,
    resolveId(this: ThisParameterType<typeof resolve>, ...args: Parameters<typeof resolve>) {
      if (args[0].startsWith("\0") || args[0].startsWith("virtual:")) return null;
      return resolve.apply(this, args);
    },
  };
});

export default defineConfig({
  plugins: [denoPlugins, tailwindcss(), reactRouter()],
  server: { host: "0.0.0.0" },
  // SSR discovers these after serving HTML; prebundle them before the first hydration request.
  optimizeDeps: {
    include: ["lucide-react", "@scalar/api-reference-react"],
  },
});
