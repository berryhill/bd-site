import type { APIRoute } from "astro";
import { writeFile, readFile } from "fs/promises";
import { join } from "path";
import { slugifyStr } from "@/utils/slugify";
import matter from "gray-matter";
import { submitToIndexNow } from "@/utils/indexnow";
import { SITE } from "@/config";
import { requireApiKey } from "@/utils/apiAuth";

export const prerender = false;

interface PostData {
  title: string;
  description: string;
  tags?: string[];
  featured?: boolean;
  draft?: boolean;
  content: string;
}

export const POST: APIRoute = async (context) => {
  // Validate API key
  const authError = requireApiKey(context);
  if (authError) return authError;

  try {
    const { request } = context;
    // Parse the incoming JSON
    const body = await request.json();
    const { title, description, tags, featured, draft, content } = body as PostData;

    // Validate required fields
    if (!title || !description || !content) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: title, description, and content are required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generate slug from title
    const slug = slugifyStr(title);

    // Generate filename
    const filename = `${slug}.md`;

    // Create frontmatter (quote title to handle special characters like colons)
    const frontmatter = `---
title: "${title}"
description: "${description}"
pubDatetime: ${new Date().toISOString()}
featured: ${featured || false}
draft: ${draft || false}
tags:
${tags && tags.length > 0 ? tags.map(tag => `  - ${tag}`).join("\n") : "  - blog"}
---

${content}`;

    // Write to file
    const filePath = join(process.cwd(), "src", "data", "blog", filename);
    await writeFile(filePath, frontmatter, "utf-8");

    // Submit to IndexNow if not a draft
    if (!draft) {
      const postUrl = `${SITE.website}posts/${slug}/`;
      await submitToIndexNow(postUrl);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Post created successfully",
        slug,
        filename,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating post:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to create post",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

interface UpdatePostData {
  slug: string;
  featured?: boolean;
  draft?: boolean;
  tags?: string[];
  title?: string;
  description?: string;
  content?: string;
}

export const PATCH: APIRoute = async (context) => {
  // Validate API key
  const authError = requireApiKey(context);
  if (authError) return authError;

  try {
    const { request } = context;
    // Parse the incoming JSON
    const body = await request.json();
    const { slug, featured, draft, tags, title, description, content } = body as UpdatePostData;

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
    if (featured === undefined && draft === undefined && !tags && !title && !description && !content) {
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

    // Read the existing post file
    const filename = `${slug}.md`;
    const filePath = join(process.cwd(), "src", "data", "blog", filename);

    let fileContent: string;
    try {
      fileContent = await readFile(filePath, "utf-8");
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Post not found",
          slug,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parse the frontmatter
    const parsed = matter(fileContent);
    const { data: frontmatterData, content: originalContent } = parsed;

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

    // Add modDatetime to track the update
    frontmatterData.modDatetime = new Date().toISOString();

    // Use updated content if provided, otherwise keep original
    const updatedContent = content !== undefined ? content : originalContent;

    // Rebuild the file with updated frontmatter and content
    const updatedFile = matter.stringify(updatedContent, frontmatterData);

    // Write back to file
    await writeFile(filePath, updatedFile, "utf-8");

    // Submit to IndexNow if not a draft
    const isDraft = draft !== undefined ? draft : frontmatterData.draft;
    if (!isDraft) {
      const postUrl = `${SITE.website}posts/${slug}/`;
      await submitToIndexNow(postUrl);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Post updated successfully",
        slug,
        updated: {
          featured: featured !== undefined ? featured : frontmatterData.featured,
          draft: draft !== undefined ? draft : frontmatterData.draft,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error updating post:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to update post",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
