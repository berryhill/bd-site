const DEFAULT_SITE = "https://berryhill.dev/";

const normalizeSiteUrl = (site: string) => new URL(site).href;

const toAbsoluteStaticUrl = (page: string, site: string) =>
  new URL(`${page.replace(/^\/+|\/+$/g, "")}/`, site).href;

export const STATIC_SITEMAP_PATHS = ["", "about", "posts", "tags"] as const;

export const REDIRECT_ONLY_SITEMAP_PATHS = ["sitemap-index.xml"] as const;

export const HIDDEN_STATIC_SITEMAP_PATHS = ["archives"] as const;

export const getStaticSitemapPaths = ({
  showArchives = true,
}: {
  showArchives?: boolean;
} = {}) =>
  [...STATIC_SITEMAP_PATHS, ...(showArchives ? ["archives"] : [])].filter(
    path =>
      !HIDDEN_STATIC_SITEMAP_PATHS.includes(
        path as (typeof HIDDEN_STATIC_SITEMAP_PATHS)[number]
      )
  );

export const buildStaticSitemapXml = ({
  site = DEFAULT_SITE,
  showArchives = true,
}: {
  site?: string;
  showArchives?: boolean;
} = {}) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${getStaticSitemapPaths({ showArchives })
  .map(page => {
    const url = page ? toAbsoluteStaticUrl(page, site) : normalizeSiteUrl(site);
    return `  <url>
    <loc>${url}</loc>
    <changefreq>daily</changefreq>
    <priority>${page === "" ? "1.0" : "0.9"}</priority>
  </url>`;
  })
  .join("\n")}
</urlset>`;

export const buildStaticSitemapResponse = ({
  site = DEFAULT_SITE,
  showArchives = true,
}: {
  site?: string;
  showArchives?: boolean;
} = {}) =>
  new Response(buildStaticSitemapXml({ site, showArchives }), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
