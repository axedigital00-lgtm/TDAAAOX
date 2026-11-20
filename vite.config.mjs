import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { fileURLToPath } from "node:url";

export default defineConfig({
  envDir: fileURLToPath(new URL("./cloudflare", import.meta.url)),
  plugins: [
    vinext(),
    cloudflare({ viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] } }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      // recharts importe react-is sans le déclarer ; npm refuse de l'ajouter (dépendance
      // enhanced-resolve introuvable) : on réutilise la copie fournie par Next (React 19.3).
      "react-is": fileURLToPath(new URL("./node_modules/next/dist/compiled/react-is", import.meta.url)),
    },
  },
});
