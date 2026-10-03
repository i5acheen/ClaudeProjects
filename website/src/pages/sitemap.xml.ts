import type { APIRoute } from "astro";
import { seo } from "../config/site";

const pages = [
  { path: "/", priority: "1.0" },
  { path: "/privacy", priority: "0.3" },
];

export const GET: APIRoute = () => {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = pages
    .map((p) => `  <url><loc>${seo.siteUrl}${p.path}</loc><lastmod>${lastmod}</lastmod><priority>${p.priority}</priority></url>`)
    .join("\n");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
};
