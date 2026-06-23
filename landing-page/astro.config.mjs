// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
// Static output (default). Mirrors the Recall People Next.js landing.
export default defineConfig({
  site: "https://recallpeople.com",
  vite: {
    plugins: [tailwindcss()],
  },
});
