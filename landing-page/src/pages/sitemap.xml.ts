import type { APIRoute } from "astro";

// Mirrors the Next.js sitemap.ts output (same URLs, changefreq, priority).
// lastmod is evaluated at build time, exactly like Next's `new Date()`.
export const GET: APIRoute = () => {
  const baseUrl = "https://recallpeople.com";
  const lastModified = new Date().toISOString();

  const entries = [
    { url: baseUrl, changeFrequency: "weekly", priority: "1" },
    { url: `${baseUrl}/privacy`, changeFrequency: "monthly", priority: "0.3" },
    { url: `${baseUrl}/terms`, changeFrequency: "monthly", priority: "0.3" },
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) =>
      `<url><loc>${e.url}</loc><lastmod>${lastModified}</lastmod><changefreq>${e.changeFrequency}</changefreq><priority>${e.priority}</priority></url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml" },
  });
};
