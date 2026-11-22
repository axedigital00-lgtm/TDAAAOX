import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { fileURLToPath } from "node:url";

process.env.AXSO_WORKER_BUILD = "1";

export default defineConfig({
  envDir: fileURLToPath(new URL("./cloudflare", import.meta.url)),
  plugins: [
    vinext(),
    cloudflare({ viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] } }),
    {
      name: "axso-ssr-entry",
      generateBundle(_, bundle) {
        // Le chargeur RSC demande ssr/index.js. Vite émet index.mjs pour ce projet CommonJS.
        if (this.environment.name === "ssr" && bundle["index.mjs"] && !bundle["index.js"]) {
          this.emitFile({ type: "asset", fileName: "index.js", source: 'export * from "./index.mjs"; export { default } from "./index.mjs";' });
        }
      },
    },
  ],
  resolve: {
    alias: [
      { find: "@", replacement: fileURLToPath(new URL(".", import.meta.url)) },
      // Workerd charge le compilateur Prisma en module WASM précompilé.
      { find: /^@prisma\/client$/, replacement: fileURLToPath(new URL("./node_modules/.prisma/client/edge.js", import.meta.url)) },
    ],
  },
});
