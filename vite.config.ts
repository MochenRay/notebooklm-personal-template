import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes(".viewer-data")) return "vault-data";
          if (!id.includes("node_modules")) return undefined;
          if (
            id.includes("react-force-graph") ||
            id.includes("force-graph") ||
            id.includes("d3-") ||
            id.includes("d3/") ||
            id.includes("kapsule")
          ) {
            return "graph-vendor";
          }
          if (id.includes("react")) return "react-vendor";
          if (id.includes("marked")) return "markdown-vendor";
          if (id.includes("lucide-react")) return "ui-vendor";
          return undefined;
        },
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
});
