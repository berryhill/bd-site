import { z } from "astro/zod";
import { SITE } from "@/config";
import { BlogStoreValidationError } from "@/content/blogStore";

// Reject null/boolean/number dates before coercion (Date(null) is a valid epoch).
const date = z.union([z.string().min(1), z.date()]).pipe(z.coerce.date());
export const blogMetadataSchema = z.object({
  author: z.string().default(SITE.author),
  pubDatetime: date,
  modDatetime: date.optional().nullable(),
  title: z.string().trim().min(1),
  featured: z.boolean().optional(),
  draft: z.boolean().optional(),
  tags: z.array(z.string()).default(["others"]),
  ogImage: z.string().optional().nullable(),
  description: z.string().trim().min(1),
  canonicalURL: z.string().optional().nullable(),
  hideEditPost: z.boolean().optional(),
  timezone: z.string().optional(),
});
const inputSchema = blogMetadataSchema.partial().extend({
  content: z.string().optional(),
  featured_image: z.string().optional().nullable(),
});

export function assertBlogInput(value: unknown) {
  const result = inputSchema.safeParse(value);
  if (!result.success)
    throw new BlogStoreValidationError("Invalid post field types or dates");
}
export function assertBlogMetadata(value: unknown) {
  const result = blogMetadataSchema.safeParse(value);
  if (!result.success)
    throw new BlogStoreValidationError("Invalid post metadata");
}
