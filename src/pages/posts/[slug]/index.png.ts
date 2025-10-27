import type { APIRoute } from "astro";
import { getLiveCollection, type CollectionEntry } from "astro:content";
import { getPath } from "@/utils/getPath";
import { generateOgImageForPost } from "@/utils/generateOgImages";
import { SITE } from "@/config";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  if (!SITE.dynamicOgImage) {
    return new Response(null, {
      status: 404,
      statusText: "Not found",
    });
  }

  const { slug } = params;
  const { entries: posts } = await getLiveCollection("liveBlog");

  if (!posts) {
    return new Response(null, {
      status: 404,
      statusText: "Not found",
    });
  }

  // Find the post matching the slug
  const post = posts.find(
    p => getPath(p.id, p.filePath, false) === slug && !p.data.draft && !p.data.ogImage
  );

  if (!post) {
    return new Response(null, {
      status: 404,
      statusText: "Not found",
    });
  }

  const buffer = await generateOgImageForPost(post as CollectionEntry<"liveBlog">);
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "image/png" },
  });
};
