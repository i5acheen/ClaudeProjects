import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import { seo } from "./src/config/site";

export default defineConfig({
  site: seo.siteUrl,
  trailingSlash: "never",
  build: { format: "file", inlineStylesheets: "always" },
  vite: { plugins: [tailwindcss()] },
});
