import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Plain Vite + React SPA. `vite build` emits a static site to dist/.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Resolves the "@/*" alias from tsconfig.json
    tsconfigPaths: true,
  },
  build: {
    outDir: "dist",
  },
});
