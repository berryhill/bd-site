import type { APIRoute } from "astro";
import { getLiveBlogPosts } from "@/content/liveBlogPosts";
import { SITE } from "@/config";
import { getPath } from "@/utils/getPath";
import getSortedPosts from "@/utils/getSortedPosts";
import { CANONICAL_SITEMAP_PATH } from "@/utils/crawlSignals";
import { toAbsoluteSiteUrl, toPostUrl } from "@/utils/url";

export const prerender = false;

export const GET: APIRoute = async () => {
  const posts = await getLiveBlogPosts();
  const sortedPosts = getSortedPosts(posts || []).slice(0, 15);

  const website = SITE.website.endsWith("/")
    ? SITE.website
    : `${SITE.website}/`;

  const body = [
    `# ${SITE.title}`,
    "",
    `> ${SITE.desc}`,
    "",
    "## When to use",
    `Research: open ${new URL("posts/", website).href}, select a relevant public article, read its date and cited sources, then cite its canonical article URL and named author. Do not treat an essay as a primary source for claims it attributes elsewhere.`,
    `Subscribe: fetch ${new URL("rss.xml", website).href} as a public RSS XML feed; read each item's link for the full article. No site account or API key is needed for this feed. Use ${new URL(CANONICAL_SITEMAP_PATH, website).href} to discover canonical pages, not as a feed.`,
    `Project inquiry: read ${new URL("start/", website).href} and ${new URL("about/", website).href}; email matt@berryhill.dev with the problem, current artifact, deadline, and decision you need to make.`,
    "",
    "## Coverage and limitations",
    "This index samples recent public posts; the posts archive and RSS list more writing. There is no advertised public SDK or MCP integration, account setup, or general-purpose reader API. These essays are not a callable agent service, an exhaustive reference, or a substitute for current primary sources. Check each article's date, claims, and linked evidence before acting.",
    "",
    "## Attribution",
    "Attribute arguments to the named article author, not automatically to Matthew Berryhill. Link to the article's canonical URL and follow its original source citations when repeating factual claims.",
    "",
    "## Core pages",
    `- [Getting started](${new URL("start/", website).href})`,
    `- [Posts](${new URL("posts/", website).href})`,
    `- [About](${new URL("about/", website).href})`,
    `- [Privacy](${new URL("privacy/", website).href})`,
    `- [RSS](${new URL("rss.xml", website).href})`,
    `- [Sitemap](${new URL(CANONICAL_SITEMAP_PATH, website).href})`,
    "",
    "## Representative posts",
    ...sortedPosts.map(post => {
      const { canonicalURL, title, description } = post.data;
      const postPath = getPath(post.id, post.filePath);
      const url = canonicalURL
        ? toAbsoluteSiteUrl(canonicalURL, website, {
            trailingSlash: true,
          })
        : toPostUrl(postPath, website);
      return `- [${title}](${url}): ${description}`;
    }),
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
