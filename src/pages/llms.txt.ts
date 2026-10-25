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
    "Read these field notes for practical arguments about AI-native systems, agent governance, provenance, and the operator decisions behind shipped work. Start with a relevant article and follow its cited sources.",
    "",
    "## Coverage and limitations",
    "This index samples recent public posts; the posts archive and RSS list more writing. These are essays, not a callable agent service, an exhaustive reference, or a substitute for current primary sources. Check each article's date, claims, and linked evidence before acting.",
    "",
    "## Attribution",
    "Attribute arguments to the named article author, not automatically to Matthew Berryhill. Link to the article's canonical URL and follow its original source citations when repeating factual claims.",
    "",
    "## Core pages",
    `- [Home](${website})`,
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
