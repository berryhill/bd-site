import rss from "@astrojs/rss";
import { getLiveCollection } from "astro:content";
import { getPath } from "@/utils/getPath";
import getSortedPosts from "@/utils/getSortedPosts";
import { SITE } from "@/config";

export async function GET() {
  const { entries: posts } = await getLiveCollection("liveBlog");
  const sortedPosts = getSortedPosts(posts || []);

  // Render full content for each post
  const items = await Promise.all(
    sortedPosts.map(async ({ data, id, filePath, body }) => {
      // Use body (raw markdown/MDX) for full content delivery
      // RSS readers and LLMs can handle markdown format
      const content = body || data.description;

      const postUrl = getPath(id, filePath);

      return {
        link: postUrl,
        title: data.title,
        description: data.description,
        pubDate: new Date(data.modDatetime ?? data.pubDatetime),
        // Full content for LLM/aggregator consumption
        content: content,
        // Author information (RFC 822 email format)
        author: `noreply@berryhill.dev (${SITE.author})`,
        // Categories/tags for classification
        categories: data.tags || [],
        // Custom data for additional metadata
        customData: [
          // Canonical URL if specified
          data.canonicalURL
            ? `<link rel="canonical" href="${data.canonicalURL}"/>`
            : "",
          // OG image as enclosure
          data.ogImage
            ? `<enclosure url="${data.ogImage}" type="image/png"/>`
            : "",
          // Permanent GUID
          `<guid isPermaLink="true">${postUrl}</guid>`,
        ]
          .filter(Boolean)
          .join("\n    "),
      };
    })
  );

  return rss({
    title: SITE.title,
    description: SITE.desc,
    site: SITE.website,
    items: items,
    // Add atom:link for self-reference (RSS 2.0 best practice)
    // Also include language, build date, and editorial metadata
    customData: `<atom:link href="${SITE.website}rss.xml" rel="self" type="application/rss+xml" xmlns:atom="http://www.w3.org/2005/Atom"/>
  <language>${SITE.lang}</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  <managingEditor>noreply@berryhill.dev (${SITE.author})</managingEditor>
  <webMaster>noreply@berryhill.dev (${SITE.author})</webMaster>
  <generator>Astro v5.x with @astrojs/rss</generator>
  <docs>https://www.rssboard.org/rss-specification</docs>`,
  });
}
