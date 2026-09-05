import type { APIRoute } from "astro";
import { join } from "path";
import { slugifyStr } from "@/utils/slugify";
import matter from "gray-matter";
import {
  BlogStoreConflictError,
  BlogStoreNotFoundError,
  BlogStorePreconditionError,
  BlogStoreReplicationPendingError,
  BlogStoreUnavailableError,
  BlogStoreValidationError,
} from "@/content/blogStore";
import {
  parseBlogSource,
  resolveCreatePubDatetime,
} from "@/content/blogSchema";
import { getBlogStore } from "@/content/blogStoreFactory";
import { resolveUpdateModDatetime } from "@/content/blogMutation";
import { SITE } from "@/config";
import { submitPublicPostCrawlSignals } from "@/utils/publicPostCrawlSignals";
import { requireApiKey } from "@/utils/apiAuth";
import { validateBlogVisualAssets } from "@/utils/blogVisualAssets";
import { auditPostTitleQuality } from "@/utils/postTitleQuality";
import { waitForSocialPreviewReadiness } from "@/utils/socialPreviewReadiness";

export const prerender = false;

interface PostData {
  title: string;
  description: string;
  author?: string;
  pubDatetime?: string;
  modDatetime?: string | null;
  tags?: string[];
  featured?: boolean;
  draft?: boolean;
  ogImage?: string | null;
  featured_image?: string | null;
  canonicalURL?: string | null;
  hideEditPost?: boolean;
  timezone?: string;
  content: string;
  operationId?: string;
}

type FrontmatterValue = string | string[] | boolean | null;

const applyOptionalFrontmatter = (
  frontmatterData: Record<string, unknown>,
  key: string,
  value: FrontmatterValue | undefined
) => {
  if (value !== undefined) {
    frontmatterData[key] = value;
  }
};

const blogStore = getBlogStore();

const jsonResponse = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const mutationPreconditionResponse = (fields: string[]) =>
  jsonResponse(
    {
      error: "Missing mutation precondition",
      details: fields.map(field => `${field} is required`),
    },
    428
  );

const storageErrorResponse = (error: unknown, action: string) => {
  if (error instanceof BlogStoreReplicationPendingError) {
    return jsonResponse(
      {
        success: true,
        state: "committed-primary",
        replication: "pending",
        operationId: error.operationId,
        action: error.action,
        slug: error.slug,
        primaryRevision: error.primaryRevision,
      },
      202
    );
  }
  if (error instanceof BlogStoreValidationError) {
    return jsonResponse(
      { error: "Invalid post storage input", details: error.message },
      400
    );
  }
  if (error instanceof BlogStoreNotFoundError) {
    return jsonResponse(
      { error: "Post not found", details: error.message },
      404
    );
  }
  if (error instanceof BlogStorePreconditionError) {
    return jsonResponse(
      { error: "Post storage precondition failed", details: error.message },
      412
    );
  }
  if (error instanceof BlogStoreConflictError) {
    return jsonResponse(
      { error: "Post storage conflict", details: error.message },
      409
    );
  }
  if (error instanceof BlogStoreUnavailableError) {
    return jsonResponse(
      { error: `Failed to ${action}`, details: "Blog storage is unavailable" },
      503
    );
  }
  return jsonResponse(
    {
      error: `Failed to ${action}`,
      details: error instanceof Error ? error.message : "Unknown error",
    },
    500
  );
};

const requestOperationId = (
  request: Request,
  body?: { operationId?: unknown }
) => {
  const value = body?.operationId ?? request.headers.get("Idempotency-Key");
  return typeof value === "string" && value.length > 0 ? value : null;
};

const requestExpectedRevision = (request: Request, value?: unknown) => {
  const revision = value ?? request.headers.get("If-Match");
  return typeof revision === "string" && revision.length > 0
    ? revision.replace(/^W\//, "").replace(/^"|"$/g, "")
    : null;
};

const blogVisualValidationErrorResponse = (content: string, slug: string) => {
  const result = validateBlogVisualAssets(content, {
    postSlug: slug,
    publicDir: join(process.cwd(), "public"),
  });

  if (result.valid) {
    return null;
  }

  return new Response(
    JSON.stringify({
      error: "Invalid blog visual asset reference",
      details: result.issues,
    }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" },
    }
  );
};

const loadTitleComparisonPosts = async () => {
  return Promise.all(
    (await blogStore.listPosts()).map(async post => {
      const parsed = parseBlogSource(post.source);
      return {
        slug: post.slug,
        title: String(parsed.data.title ?? ""),
        draft: Boolean(parsed.data.draft),
        pubDatetime: parsed.data.pubDatetime as
          | string
          | Date
          | null
          | undefined,
      };
    })
  );
};

const titleQualityValidationErrorResponse = async (
  title: string,
  { currentSlug, draft }: { currentSlug?: string; draft?: boolean } = {}
) => {
  if (draft) return null;

  const result = auditPostTitleQuality(
    title,
    await loadTitleComparisonPosts(),
    {
      currentSlug,
    }
  );
  if (result.ok) return null;

  return new Response(
    JSON.stringify({
      error: "Invalid post title quality",
      details: result.issues,
      titleQuality: {
        renderedTitle: result.renderedTitle,
        renderedTitleLength: result.renderedTitleLength,
        maxRenderedTitleLength: result.maxRenderedTitleLength,
      },
    }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" },
    }
  );
};

type PostRecord = Record<string, unknown> & {
  featured?: boolean;
  draft?: boolean;
  pubDatetime?: string | Date;
  modDatetime?: string | Date | null;
};

const publicPostUrl = (slug: string) => `${SITE.website}posts/${slug}/`;

const verifyPublicPostShareReadiness = async (slug: string) =>
  waitForSocialPreviewReadiness(publicPostUrl(slug));

export const GET: APIRoute = async context => {
  const authError = requireApiKey(context);
  if (authError) return authError;

  try {
    const searchParams = new URL(context.url).searchParams;
    const slug = searchParams.get("slug");
    const featured = searchParams.get("featured");
    const draft = searchParams.get("draft");

    if (slug) {
      const stored = await blogStore.getPost(slug);
      if (!stored) {
        return jsonResponse({ error: "Post not found", slug }, 404);
      }
      const parsed = parseBlogSource(stored.source);
      return jsonResponse(
        {
          success: true,
          post: {
            slug,
            ...parsed.data,
            content: parsed.content,
            revision: stored.revision,
            updatedAt: stored.updatedAt,
          },
        },
        200
      );
    }

    const posts: PostRecord[] = (await blogStore.listPosts()).map(stored => {
      const parsed = parseBlogSource(stored.source);
      return {
        slug: stored.slug,
        ...parsed.data,
        content: parsed.content,
        revision: stored.revision,
        updatedAt: stored.updatedAt,
      };
    });

    let filteredPosts = posts;
    if (featured !== null) {
      const isFeatured = featured === "true";
      filteredPosts = filteredPosts.filter(
        post => post.featured === isFeatured
      );
    }
    if (draft !== null) {
      const isDraft = draft === "true";
      filteredPosts = filteredPosts.filter(post => post.draft === isDraft);
    }
    filteredPosts.sort((a, b) => {
      const dateA = new Date(a.modDatetime || a.pubDatetime || 0).getTime();
      const dateB = new Date(b.modDatetime || b.pubDatetime || 0).getTime();
      return dateB - dateA;
    });

    return jsonResponse(
      { success: true, count: filteredPosts.length, posts: filteredPosts },
      200
    );
  } catch (error) {
    return storageErrorResponse(error, "fetch posts");
  }
};

export const POST: APIRoute = async context => {
  // Validate API key
  const authError = requireApiKey(context);
  if (authError) return authError;

  try {
    const { request } = context;
    // Parse the incoming JSON
    const body = await request.json();
    const operationId = requestOperationId(request, body as PostData);
    if (!operationId) return mutationPreconditionResponse(["operationId"]);
    const {
      title,
      description,
      author,
      pubDatetime,
      modDatetime,
      tags,
      featured,
      draft,
      ogImage,
      featured_image,
      canonicalURL,
      hideEditPost,
      timezone,
      content,
    } = body as PostData;

    // Validate required fields
    if (!title || !description || !content) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required fields: title, description, and content are required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generate slug from title
    const slug = slugifyStr(title);

    // A retry must rebuild the exact source bytes written by the first attempt.
    // Reuse the stored generated timestamp when the caller omitted pubDatetime;
    // BlogStore still rejects duplicate creates with a different operationId.
    const existingPost = pubDatetime ? null : await blogStore.getPost(slug);
    const existingPubDatetime = existingPost
      ? parseBlogSource(existingPost.source).data.pubDatetime
      : undefined;

    const titleQualityError = await titleQualityValidationErrorResponse(title, {
      currentSlug: slug,
      draft,
    });
    if (titleQualityError) return titleQualityError;

    const validationError = blogVisualValidationErrorResponse(content, slug);
    if (validationError) return validationError;

    // Generate filename
    const filename = `${slug}.md`;

    // Create frontmatter data object
    const frontmatterData: Record<string, unknown> = {
      title,
      description,
      pubDatetime: resolveCreatePubDatetime(pubDatetime, existingPubDatetime),
      featured: featured ?? false,
      draft: draft ?? false,
      tags: tags && tags.length > 0 ? tags : ["blog"],
    };

    applyOptionalFrontmatter(frontmatterData, "author", author);
    applyOptionalFrontmatter(frontmatterData, "modDatetime", modDatetime);
    applyOptionalFrontmatter(
      frontmatterData,
      "ogImage",
      ogImage !== undefined ? ogImage : featured_image
    );
    applyOptionalFrontmatter(frontmatterData, "canonicalURL", canonicalURL);
    applyOptionalFrontmatter(frontmatterData, "hideEditPost", hideEditPost);
    applyOptionalFrontmatter(frontmatterData, "timezone", timezone);

    // Use gray-matter to properly stringify frontmatter with content
    const fileContent = matter.stringify(content, frontmatterData);

    const stored = await blogStore.putPost(
      slug,
      new TextEncoder().encode(fileContent),
      { expectedRevision: "absent", operationId }
    );

    // Verify public social-card readiness before submitting crawler signals.
    const socialPreviewReadiness = !draft
      ? await verifyPublicPostShareReadiness(slug)
      : undefined;
    const crawlSignals = socialPreviewReadiness?.ready
      ? await submitPublicPostCrawlSignals(publicPostUrl(slug))
      : undefined;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Post created successfully",
        slug,
        filename,
        revision: stored.revision,
        shareReady: socialPreviewReadiness?.ready,
        socialPreviewReadiness,
        crawlSignals,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return storageErrorResponse(error, "create post");
  }
};

interface UpdatePostData {
  slug: string;
  author?: string;
  pubDatetime?: string;
  modDatetime?: string | null;
  featured?: boolean;
  draft?: boolean;
  tags?: string[];
  title?: string;
  description?: string;
  ogImage?: string | null;
  featured_image?: string | null;
  canonicalURL?: string | null;
  hideEditPost?: boolean;
  timezone?: string;
  content?: string;
  expectedRevision?: string;
  operationId?: string;
}

export const PATCH: APIRoute = async context => {
  // Validate API key
  const authError = requireApiKey(context);
  if (authError) return authError;

  try {
    const { request } = context;
    // Parse the incoming JSON
    const body = await request.json();
    const operationId = requestOperationId(request, body as UpdatePostData);
    const expectedRevision = requestExpectedRevision(
      request,
      (body as UpdatePostData).expectedRevision
    );
    const missingPreconditions = [
      ...(!operationId ? ["operationId"] : []),
      ...(!expectedRevision ? ["expectedRevision"] : []),
    ];
    if (missingPreconditions.length > 0) {
      return mutationPreconditionResponse(missingPreconditions);
    }
    const {
      slug,
      author,
      pubDatetime,
      modDatetime,
      featured,
      draft,
      tags,
      title,
      description,
      ogImage,
      featured_image,
      canonicalURL,
      hideEditPost,
      timezone,
      content,
    } = body as UpdatePostData;

    // Validate required field
    if (!slug) {
      return new Response(
        JSON.stringify({
          error: "Missing required field: slug",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check if at least one field to update is provided
    if (
      featured === undefined &&
      draft === undefined &&
      author === undefined &&
      pubDatetime === undefined &&
      modDatetime === undefined &&
      !tags &&
      !title &&
      !description &&
      ogImage === undefined &&
      featured_image === undefined &&
      canonicalURL === undefined &&
      hideEditPost === undefined &&
      timezone === undefined &&
      content === undefined
    ) {
      return new Response(
        JSON.stringify({
          error: "No fields to update provided",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const storedPost = await blogStore.getPost(slug);
    if (!storedPost) {
      return jsonResponse({ error: "Post not found", slug }, 404);
    }
    const parsed = parseBlogSource(storedPost.source);
    const { data: frontmatterData, content: originalContent } = parsed;
    const currentModDatetime = frontmatterData.modDatetime;

    // Update only the provided fields
    if (featured !== undefined) {
      frontmatterData.featured = featured;
    }
    if (draft !== undefined) {
      frontmatterData.draft = draft;
    }
    if (tags) {
      frontmatterData.tags = tags;
    }
    if (title) {
      frontmatterData.title = title;
    }
    if (description) {
      frontmatterData.description = description;
    }
    applyOptionalFrontmatter(frontmatterData, "author", author);
    applyOptionalFrontmatter(frontmatterData, "pubDatetime", pubDatetime);
    applyOptionalFrontmatter(
      frontmatterData,
      "ogImage",
      ogImage !== undefined ? ogImage : featured_image
    );
    applyOptionalFrontmatter(frontmatterData, "canonicalURL", canonicalURL);
    applyOptionalFrontmatter(frontmatterData, "hideEditPost", hideEditPost);
    applyOptionalFrontmatter(frontmatterData, "timezone", timezone);

    frontmatterData.modDatetime = resolveUpdateModDatetime({
      providedModDatetime: modDatetime,
      currentModDatetime,
      currentRevision: storedPost.revision,
      expectedRevision: expectedRevision!,
    });

    // Use updated content if provided, otherwise keep original
    const updatedContent = content !== undefined ? content : originalContent;

    const isDraft = draft !== undefined ? draft : frontmatterData.draft;
    const titleQualityError = await titleQualityValidationErrorResponse(
      String(frontmatterData.title ?? ""),
      {
        currentSlug: slug,
        draft: Boolean(isDraft),
      }
    );
    if (titleQualityError) return titleQualityError;

    const validationError = blogVisualValidationErrorResponse(
      updatedContent,
      slug
    );
    if (validationError) return validationError;

    // Rebuild the file with updated frontmatter and content
    const updatedFile = matter.stringify(updatedContent, frontmatterData);

    const stored = await blogStore.putPost(
      slug,
      new TextEncoder().encode(updatedFile),
      { expectedRevision: expectedRevision!, operationId: operationId! }
    );

    // Verify public social-card readiness before submitting crawler signals.
    const socialPreviewReadiness = !isDraft
      ? await verifyPublicPostShareReadiness(slug)
      : undefined;
    const crawlSignals = socialPreviewReadiness?.ready
      ? await submitPublicPostCrawlSignals(publicPostUrl(slug))
      : undefined;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Post updated successfully",
        slug,
        revision: stored.revision,
        updated: {
          featured:
            featured !== undefined ? featured : frontmatterData.featured,
          draft: draft !== undefined ? draft : frontmatterData.draft,
        },
        shareReady: socialPreviewReadiness?.ready,
        socialPreviewReadiness,
        crawlSignals,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return storageErrorResponse(error, "update post");
  }
};

export const DELETE: APIRoute = async context => {
  const authError = requireApiKey(context);
  if (authError) return authError;

  try {
    const searchParams = new URL(context.url).searchParams;
    const slug = searchParams.get("slug");
    if (!slug) {
      return jsonResponse({ error: "Missing required parameter: slug" }, 400);
    }
    const operationId = requestOperationId(context.request, {
      operationId: searchParams.get("operationId"),
    });
    const expectedRevision = requestExpectedRevision(
      context.request,
      searchParams.get("expectedRevision")
    );
    const missingPreconditions = [
      ...(!operationId ? ["operationId"] : []),
      ...(!expectedRevision ? ["expectedRevision"] : []),
    ];
    if (missingPreconditions.length > 0) {
      return mutationPreconditionResponse(missingPreconditions);
    }

    await blogStore.deletePost(slug, {
      expectedRevision: expectedRevision!,
      operationId: operationId!,
    });
    return jsonResponse(
      { success: true, message: "Post deleted successfully", slug },
      200
    );
  } catch (error) {
    return storageErrorResponse(error, "delete post");
  }
};
