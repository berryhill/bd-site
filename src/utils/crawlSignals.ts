const DEFAULT_SITE = "https://berryhill.dev/";

export const CANONICAL_SITEMAP_PATH = "sitemap.xml";

export const CRAWLER_USER_AGENTS = [
  "*",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "anthropic-ai",
  "claude-web",
  "Claude-User",
  "Google-Extended",
  "GoogleOther",
  "PerplexityBot",
  "CCBot",
  "Meta-ExternalAgent",
  "Meta-ExternalFetcher",
  "FacebookBot",
  "Applebot-Extended",
  "Amazonbot",
  "Bytespider",
  "cohere-ai",
  "YouBot",
  "Diffbot",
  "ImagesiftBot",
  "Omgili",
  "Omgilibot",
] as const;

export const CRAWL_ASSET_DISALLOW_PATHS = [
  "/pagefind/",
  "/_astro/",
  "/assets/",
  "/*.css$",
  "/*.js$",
  "/*.map$",
  "/*.json$",
  "/*.png$",
  "/*.jpg$",
  "/*.jpeg$",
  "/*.gif$",
  "/*.svg$",
  "/*.webp$",
  "/*.ico$",
] as const;

export const getCanonicalSitemapUrl = (site: string = DEFAULT_SITE) =>
  new URL(CANONICAL_SITEMAP_PATH, site).href;

export const getLayoutSitemapHref = () => `/${CANONICAL_SITEMAP_PATH}`;

const getCrawlerGroup = (userAgent: string) =>
  [
    `User-agent: ${userAgent}`,
    "Allow: /",
    ...CRAWL_ASSET_DISALLOW_PATHS.map(path => `Disallow: ${path}`),
  ].join("\n");

export const getRobotsTxt = (site: string = DEFAULT_SITE) => {
  const sitemapUrl = getCanonicalSitemapUrl(site);

  return `${CRAWLER_USER_AGENTS.map(getCrawlerGroup).join("\n\n")}

Sitemap: ${sitemapUrl}

# AI/LLM crawler manifest
Allow: /llms.txt
`;
};
