import type { APIRoute } from "astro";
import { getLiveCollection } from "astro:content";
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

  const { entries: posts } = await getLiveCollection("liveBlog");

  return renderDynamicPostOgImageEndpoint({
    posts,
    slug: params.slug,
    renderPostOgImage: post =>
      generateOgImageForPost(
        post as Parameters<typeof generateOgImageForPost>[0]
      ),
  });
};
