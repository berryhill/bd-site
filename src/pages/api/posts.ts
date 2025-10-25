import type { APIRoute } from "astro";
import { writeFile } from "fs/promises";
import { join } from "path";
import { slugifyStr } from "@/utils/slugify";

export const prerender = false;

interface PostData {
  title: string;
  description: string;
  tags?: string[];
  featured?: boolean;
  draft?: boolean;
  content: string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
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
slug: ${slug}
featured: ${featured || false}
draft: ${draft || false}
tags:
${tags && tags.length > 0 ? tags.map(tag => `  - ${tag}`).join("\n") : "  - blog"}
---

${content}`;

    // Write to file
    const filePath = join(process.cwd(), "src", "data", "blog", filename);
    await writeFile(filePath, frontmatter, "utf-8");

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
