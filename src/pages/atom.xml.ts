import { getLiveCollection } from "astro:content";
import { SITE } from "@/config";
import { getPath } from "@/utils/getPath";
import getSortedPosts from "@/utils/getSortedPosts";

export const prerender = false;

export async function GET() {
  const { entries: posts } = await getLiveCollection("liveBlog");
  const sortedPosts = getSortedPosts(posts || []);

  const website = SITE.website.endsWith("/")
    ? SITE.website
    : `${SITE.website}/`;

  const now = new Date().toUTCString();
  const feedUrl = `${website}atom.xml`;

  const entries = await Promise.all(
    sortedPosts.map(async ({ data, id, filePath }) => {
      const postUrl = getPath(id, filePath);
      const fullUrl = new URL(postUrl, website).href;
      const pubDate = new Date(data.modDatetime ?? data.pubDatetime);

      const summary = data.description ?? "";

      const tags = (data.tags ?? [])
        .map(tag => `      <category term="${escapeXml(String(tag))}" />`)
        .join("\n");

      return `    <entry>
      <title>${escapeXml(data.title ?? "")}</title>
      <id>${escapeXml(fullUrl)}</id>
      <updated>${pubDate.toISOString()}</updated>
      <published>${pubDate.toISOString()}</published>
      <summary type="text">${escapeXml(summary)}</summary>
      <link href="${escapeXml(fullUrl)}" rel="alternate" type="text/html" />
${tags}
    </entry>`;
    })
  );

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${escapeXml(website)}</id>
  <title>${escapeXml(SITE.title)}</title>
  <subtitle>${escapeXml(SITE.desc ?? "")}</subtitle>
  <updated>${now}</updated>
  <author>
    <name>${escapeXml(SITE.author ?? "")}</name>
  </author>
  <link href="${escapeXml(feedUrl)}" rel="self" type="application/atom+xml" />
  <link href="${escapeXml(website)}" rel="alternate" type="text/html" />
  <generator>Astro v5.x</generator>
  <rights>Copyright ${new Date().getFullYear()} ${escapeXml(SITE.author ?? "")}</rights>
${entries.join("\n")}
</feed>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
