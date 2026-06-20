import fs from "node:fs";
import path from "node:path";

export interface BlogVisualAssetValidationOptions {
  postSlug: string;
  publicDir?: string;
}

export interface BlogImageReference {
  src: string;
  altText: string;
  caption: string;
  source: "markdown" | "html";
}

export interface BlogVisualAssetIssue {
  src: string;
  reason: string;
}

export interface BlogVisualAssetValidationResult {
  valid: boolean;
  issues: BlogVisualAssetIssue[];
}

const MARKDOWN_IMAGE_REGEX =
  /!\[([^\]]*)\]\(([^\s)]+)(?:\s+["']([^"']*)["'])?\)/g;
const HTML_IMAGE_REGEX = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
const BLOG_ASSET_PUBLIC_PREFIX = "/assets/blog/";

function getAttribute(tag: string, name: string): string {
  const attributeRegex = new RegExp(`\\b${name}=["']([^"']*)["']`, "i");
  return attributeRegex.exec(tag)?.[1]?.trim() ?? "";
}

function isBlogVisualAsset(src: string): boolean {
  return src.startsWith(BLOG_ASSET_PUBLIC_PREFIX);
}

function hasUnsafePathSegment(src: string): boolean {
  return src.split(/[\\/]/).some(segment => segment === "..");
}

export function extractBlogImageReferences(
  markdown: string
): BlogImageReference[] {
  const references = new Map<string, BlogImageReference>();

  for (const match of markdown.matchAll(MARKDOWN_IMAGE_REGEX)) {
    const src = match[2].trim();
    references.set(`markdown:${src}`, {
      src,
      altText: match[1].trim(),
      caption: match[3]?.trim() ?? "",
      source: "markdown",
    });
  }

  for (const match of markdown.matchAll(HTML_IMAGE_REGEX)) {
    const tag = match[0];
    const src = match[1].trim();
    references.set(`html:${src}`, {
      src,
      altText: getAttribute(tag, "alt"),
      caption: getAttribute(tag, "title"),
      source: "html",
    });
  }

  return [...references.values()];
}

export function extractBlogImageSources(markdown: string): string[] {
  return [
    ...new Set(extractBlogImageReferences(markdown).map(({ src }) => src)),
  ];
}

export function isInlineImageDataUri(src: string): boolean {
  return /^data:image\//i.test(src.trim());
}

export function validateBlogVisualAssets(
  markdown: string,
  options: BlogVisualAssetValidationOptions
): BlogVisualAssetValidationResult {
  const issues: BlogVisualAssetIssue[] = [];
  const publicDir = options.publicDir ?? path.resolve("public");

  for (const reference of extractBlogImageReferences(markdown)) {
    const { src } = reference;

    if (isInlineImageDataUri(src)) {
      issues.push({
        src,
        reason:
          "Inline data:image URIs are not allowed. Store durable blog visuals under public/assets/blog/<post-slug>/ and reference them with a normal /assets/blog/<post-slug>/... URL.",
      });
      continue;
    }

    if (!isBlogVisualAsset(src)) {
      continue;
    }

    const expectedPrefix = `${BLOG_ASSET_PUBLIC_PREFIX}${options.postSlug}/`;

    if (!src.startsWith(expectedPrefix)) {
      issues.push({
        src,
        reason: `Blog visual assets must live under ${expectedPrefix} for this post.`,
      });
      continue;
    }

    if (hasUnsafePathSegment(src)) {
      issues.push({
        src,
        reason:
          "Blog visual asset paths cannot include parent-directory segments.",
      });
      continue;
    }

    if (!reference.altText) {
      issues.push({
        src,
        reason: "Blog visual assets require non-empty alt text.",
      });
    }

    if (!reference.caption) {
      issues.push({
        src,
        reason:
          'Blog visual assets require a caption/title in the Markdown image reference, for example: ![Alt text](/assets/blog/post/diagram.svg "Caption text").',
      });
    }

    const assetPath = path.resolve(publicDir, `.${src}`);
    const publicRoot = path.resolve(publicDir);

    if (!assetPath.startsWith(`${publicRoot}${path.sep}`)) {
      issues.push({
        src,
        reason: "Blog visual asset path resolves outside public/.",
      });
      continue;
    }

    if (!fs.existsSync(assetPath) || !fs.statSync(assetPath).isFile()) {
      issues.push({
        src,
        reason: `Referenced blog visual asset does not exist at ${path.relative(process.cwd(), assetPath)}.`,
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function assertValidBlogVisualAssets(
  markdown: string,
  options: BlogVisualAssetValidationOptions
): void {
  const result = validateBlogVisualAssets(markdown, options);

  if (!result.valid) {
    const details = result.issues
      .map(issue => `${issue.src}: ${issue.reason}`)
      .join("; ");
    throw new Error(`Invalid blog visual asset reference(s): ${details}`);
  }
}
