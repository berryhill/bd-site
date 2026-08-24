import matter from "gray-matter";
import { BlogStoreValidationError } from "@/content/blogStore";

const CANONICAL_BLOG_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const OPERATION_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function assertCanonicalBlogSlug(slug: unknown): string {
  if (typeof slug !== "string" || !CANONICAL_BLOG_SLUG.test(slug)) {
    throw new BlogStoreValidationError(
      "Post slug must be a canonical lowercase kebab-case identifier"
    );
  }
  if (decodeURIComponent(slug) !== slug) {
    throw new BlogStoreValidationError("Encoded post slugs are not allowed");
  }
  return slug;
}

export function assertBlogOperationId(operationId: unknown): string {
  if (typeof operationId !== "string" || !OPERATION_ID.test(operationId)) {
    throw new BlogStoreValidationError(
      "operationId must be 1-128 URL-safe characters"
    );
  }
  return operationId;
}

export function decodeBlogSource(source: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(source);
  } catch (error) {
    throw new BlogStoreValidationError(
      `Post source must be valid UTF-8: ${error instanceof Error ? error.message : "invalid bytes"}`
    );
  }
}

export function parseBlogSource(source: Uint8Array) {
  const parsed = matter(decodeBlogSource(source));
  const requiredStrings = ["title", "description", "pubDatetime"] as const;
  const missing = requiredStrings.filter(
    key =>
      parsed.data[key] === undefined ||
      parsed.data[key] === null ||
      String(parsed.data[key]).trim().length === 0
  );
  if (missing.length > 0) {
    throw new BlogStoreValidationError(
      `Post frontmatter is missing required fields: ${missing.join(", ")}`
    );
  }
  if (parsed.data.tags !== undefined && !Array.isArray(parsed.data.tags)) {
    throw new BlogStoreValidationError(
      "Post frontmatter tags must be an array"
    );
  }
  return parsed;
}

export function resolveCreatePubDatetime(
  requested: string | undefined,
  existing: unknown,
  now = () => new Date().toISOString()
) {
  return requested ?? existing ?? now();
}
