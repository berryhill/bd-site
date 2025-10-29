import type { APIRoute } from "astro";
import { getLiveCollection } from "astro:content";
import { SITE } from "@/config";
import { getPath } from "@/utils/getPath";

export const prerender = false;

export const GET: APIRoute = async () => {
  // Get all blog posts from live collection
  const { entries: allPosts } = await getLiveCollection("liveBlog");

  // Filter out drafts and sort by date
  const publishedPosts = allPosts
    .filter(post => !post.data.draft)
    .sort((a, b) => {
      const dateA = a.data.modDatetime || a.data.pubDatetime;
      const dateB = b.data.modDatetime || b.data.pubDatetime;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

  // Generate XML sitemap for posts
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${publishedPosts
  .map(post => {
    const url = `${SITE.website}${getPath({ post: post.id })}`;
    const lastmod = (post.data.modDatetime || post.data.pubDatetime).toISOString();

    return `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  })
  .join("\n")}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
