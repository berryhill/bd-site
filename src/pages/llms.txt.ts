import type { APIRoute } from "astro";
import { getLiveCollection } from "astro:content";
import { SITE } from "@/config";
import { getPath } from "@/utils/getPath";
import getSortedPosts from "@/utils/getSortedPosts";

export const prerender = false;

export const GET: APIRoute = async () => {
  const { entries: posts } = await getLiveCollection("liveBlog");
  const sortedPosts = getSortedPosts(posts || []).slice(0, 15);

  const website = SITE.website.endsWith("/")
    ? SITE.website
    : `${SITE.website}/`;

  const body = [
    `# ${SITE.title}`,
    "",
    `> ${SITE.desc}`,
    "",
    "## Core pages",
    `- [Home](${website})`,
    `- [Posts](${new URL("posts/", website).href})`,
    `- [About](${new URL("about/", website).href})`,
    `- [RSS](${new URL("rss.xml", website).href})`,
    `- [Sitemap](${new URL("sitemap-index.xml", website).href})`,
    "",
    "## Representative posts",
    ...sortedPosts.map(post => {
      const postPath = getPath(post.id, post.filePath);
      const url = new URL(postPath, website).href;
      return `- [${post.data.title}](${url}): ${post.data.description}`;
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
