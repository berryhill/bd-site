type DynamicOgImagePost = {
  id: string;
  data: {
    draft?: boolean;
    ogImage?: string | null;
  };
};

export type DynamicPostOgImageRenderer<TPost extends DynamicOgImagePost> = (
  post: TPost
) => Promise<ArrayBuffer | ArrayBufferView>;

const DYNAMIC_OG_SUCCESS_CACHE_CONTROL = "public, max-age=31536000, immutable";
const DYNAMIC_OG_FAILURE_CACHE_CONTROL = "no-store";

export function findDynamicPostOgImagePost<TPost extends DynamicOgImagePost>(
  posts: TPost[] | undefined,
  slug: string | undefined
): TPost | undefined {
  if (!posts || !slug) return undefined;

  return posts.find(
    post => post.id === slug && !post.data.draft && !post.data.ogImage
  );
}

function notFoundResponse() {
  return new Response(null, {
    status: 404,
    statusText: "Not found",
    headers: { "Cache-Control": DYNAMIC_OG_FAILURE_CACHE_CONTROL },
  });
}

function toUint8Array(buffer: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (buffer instanceof ArrayBuffer) return new Uint8Array(buffer);

  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

export async function renderDynamicPostOgImageEndpoint<
  TPost extends DynamicOgImagePost,
>({
  posts,
  renderPostOgImage,
  slug,
}: {
  posts: TPost[] | undefined;
  renderPostOgImage: DynamicPostOgImageRenderer<TPost>;
  slug: string | undefined;
}): Promise<Response> {
  const post = findDynamicPostOgImagePost(posts, slug);

  if (!post) return notFoundResponse();

  try {
    const imageBuffer = await renderPostOgImage(post);

    const body = toUint8Array(imageBuffer) as unknown as BodyInit;

    return new Response(body, {
      headers: {
        "Cache-Control": DYNAMIC_OG_SUCCESS_CACHE_CONTROL,
        "Content-Type": "image/png",
      },
    });
  } catch {
    return new Response("OG image render failed", {
      status: 500,
      statusText: "Internal Server Error",
      headers: {
        "Cache-Control": DYNAMIC_OG_FAILURE_CACHE_CONTROL,
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}
