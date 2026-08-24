import type { APIRoute } from "astro";
import { getLiveBlogPosts } from "@/content/liveBlogPosts";
import { generateOgImageForPost } from "@/utils/generateOgImages";
import { renderDynamicPostOgImageEndpoint } from "@/utils/dynamicPostOgImageEndpoint";
import { SITE } from "@/config";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  if (!SITE.dynamicOgImage) {
    return new Response(null, {
      status: 404,
      statusText: "Not found",
    });
  }

  const posts = await getLiveBlogPosts();

  return renderDynamicPostOgImageEndpoint({
    posts,
    slug: params.slug,
    renderPostOgImage: post =>
      generateOgImageForPost(
        post as Parameters<typeof generateOgImageForPost>[0]
      ),
  });
};
