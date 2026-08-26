import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills({
      include: ["buffer", "process", "util", "stream"],
      globals: { Buffer: true, process: true },
    }),
  ],

  // Los shims de node-polyfills se descubrían a mitad de la primera carga, y
  // Vite respondía con "optimized dependencies changed. reloading", es decir
  // una recarga completa de la página. Declararlos aquí hace que entren en la
  // primera pasada de optimización y la sesión no se recargue sola.
  optimizeDeps: {
    include: [
      "vite-plugin-node-polyfills/shims/buffer",
      "vite-plugin-node-polyfills/shims/global",
      "vite-plugin-node-polyfills/shims/process",
    ],
  },
});
