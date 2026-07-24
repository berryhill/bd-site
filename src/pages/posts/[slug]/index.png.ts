import type { APIRoute } from "astro";
import { getLiveEntry } from "astro:content";
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

  const liveEntry = params.slug
    ? await getLiveEntry("liveBlog", params.slug)
    : undefined;
  const post = liveEntry
    ? "id" in liveEntry
      ? liveEntry
      : "entry" in liveEntry
        ? liveEntry.entry
        : undefined
    : undefined;

  return renderDynamicPostOgImageEndpoint({
    posts: post ? [post] : undefined,
    slug: params.slug,
    renderPostOgImage: post =>
      generateOgImageForPost(
        post as Parameters<typeof generateOgImageForPost>[0]
      ),
  });
};
