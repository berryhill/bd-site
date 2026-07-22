export interface SocialPreviewMetadata {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
}

export interface SocialPreviewIssue {
  field: keyof SocialPreviewMetadata;
  reason: string;
}

export interface SocialPreviewValidationResult {
  valid: boolean;
  metadata: SocialPreviewMetadata;
  issues: SocialPreviewIssue[];
}

type SocialPreviewImageField = "ogImage" | "twitterImage";

export interface SocialPreviewImageReachabilityIssue {
  field: SocialPreviewImageField;
  url: string;
  reason: string;
}

export interface SocialPreviewImageReachabilityResult {
  valid: boolean;
  issues: SocialPreviewImageReachabilityIssue[];
}

const REQUIRED_FIELDS: Array<keyof SocialPreviewMetadata> = [
  "title",
  "description",
  "ogTitle",
  "ogDescription",
  "ogImage",
  "twitterCard",
  "twitterTitle",
  "twitterDescription",
  "twitterImage",
];

function decodeHtmlEntity(entity: string): string {
  if (entity.startsWith("&#x") || entity.startsWith("&#X")) {
    const value = Number.parseInt(entity.slice(3, -1), 16);
    return Number.isNaN(value) ? entity : String.fromCodePoint(value);
  }

  if (entity.startsWith("&#")) {
    const value = Number.parseInt(entity.slice(2, -1), 10);
    return Number.isNaN(value) ? entity : String.fromCodePoint(value);
  }

  const namedEntities: Record<string, string> = {
    "&amp;": "&",
    "&apos;": "'",
    "&gt;": ">",
    "&lt;": "<",
    "&quot;": '"',
  };

  return namedEntities[entity] ?? entity;
}

export function decodeHtml(value: string): string {
  return value.replace(
    /&(amp|apos|gt|lt|quot|#\d+|#x[\da-f]+);/gi,
    decodeHtmlEntity
  );
}

function extractAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const attributePattern = /([:\w-]+)\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+)/g;

  for (const match of tag.matchAll(attributePattern)) {
    const rawValue = match[2];
    const value =
      rawValue.startsWith('"') || rawValue.startsWith("'")
        ? rawValue.slice(1, -1)
        : rawValue;
    attributes[match[1].toLowerCase()] = decodeHtml(value.trim());
  }

  return attributes;
}

function extractTitle(html: string): string | undefined {
  const title = html.match(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/i)?.[1];
  return title ? decodeHtml(title.replace(/\s+/g, " ").trim()) : undefined;
}

function extractMetaContent(
  html: string,
  keyName: "name" | "property",
  keyValue: string
): string | undefined {
  const metaTagPattern = /<meta\s+[^>]*>/gi;

  for (const match of html.matchAll(metaTagPattern)) {
    const attributes = extractAttributes(match[0]);
    if (attributes[keyName]?.toLowerCase() === keyValue.toLowerCase()) {
      return attributes.content?.trim() || undefined;
    }
  }

  return undefined;
}

export function extractSocialPreviewMetadata(
  html: string
): SocialPreviewMetadata {
  return {
    title: extractTitle(html),
    description: extractMetaContent(html, "name", "description"),
    ogTitle: extractMetaContent(html, "property", "og:title"),
    ogDescription: extractMetaContent(html, "property", "og:description"),
    ogImage: extractMetaContent(html, "property", "og:image"),
    twitterCard: extractMetaContent(html, "property", "twitter:card"),
    twitterTitle: extractMetaContent(html, "property", "twitter:title"),
    twitterDescription: extractMetaContent(
      html,
      "property",
      "twitter:description"
    ),
    twitterImage: extractMetaContent(html, "property", "twitter:image"),
  };
}

export function validateSocialPreviewMetadata(
  html: string
): SocialPreviewValidationResult {
  const metadata = extractSocialPreviewMetadata(html);
  const issues: SocialPreviewIssue[] = [];

  for (const field of REQUIRED_FIELDS) {
    if (!metadata[field]) {
      issues.push({
        field,
        reason: "Required social preview metadata is missing",
      });
    }
  }

  if (metadata.twitterCard && metadata.twitterCard !== "summary_large_image") {
    issues.push({
      field: "twitterCard",
      reason: 'Twitter card should be "summary_large_image" for blog previews',
    });
  }

  if (
    metadata.title &&
    metadata.ogTitle &&
    metadata.twitterTitle &&
    (metadata.ogTitle !== metadata.title ||
      metadata.twitterTitle !== metadata.title)
  ) {
    issues.push({
      field: "ogTitle",
      reason: "Title, og:title, and twitter:title should match",
    });
  }

  if (
    metadata.description &&
    metadata.ogDescription &&
    metadata.twitterDescription &&
    (metadata.ogDescription !== metadata.description ||
      metadata.twitterDescription !== metadata.description)
  ) {
    issues.push({
      field: "ogDescription",
      reason:
        "Meta description, og:description, and twitter:description should match",
    });
  }

  if (
    metadata.ogImage &&
    metadata.twitterImage &&
    metadata.ogImage !== metadata.twitterImage
  ) {
    issues.push({
      field: "ogImage",
      reason: "og:image and twitter:image should match",
    });
  }

  return {
    valid: issues.length === 0,
    metadata,
    issues,
  };
}

export async function validateSocialPreviewImageReachability(
  metadata: SocialPreviewMetadata,
  fetcher: typeof fetch = fetch
): Promise<SocialPreviewImageReachabilityResult> {
  const issues: SocialPreviewImageReachabilityIssue[] = [];
  const imageEntries = [
    ["ogImage", metadata.ogImage],
    ["twitterImage", metadata.twitterImage],
  ] as const;
  const checkedUrls = new Map<string, string>();

  for (const [field, imageUrl] of imageEntries) {
    if (!imageUrl) continue;

    if (checkedUrls.has(imageUrl)) {
      const priorIssue = checkedUrls.get(imageUrl);
      if (priorIssue) {
        issues.push({ field, url: imageUrl, reason: priorIssue });
      }
      continue;
    }

    try {
      const response = await fetcher(imageUrl, {
        headers: { "User-Agent": "Twitterbot/1.0" },
        redirect: "follow",
      });
      const contentType = response.headers.get("content-type") ?? "";
      let issueReason = "";

      if (!response.ok) {
        issueReason =
          `Image URL returned ${response.status} ${response.statusText}`.trim();
      } else if (!contentType.toLowerCase().startsWith("image/")) {
        issueReason = `Image URL returned non-image content type ${contentType || "unknown"}`;
      }

      checkedUrls.set(imageUrl, issueReason);
      if (issueReason)
        issues.push({ field, url: imageUrl, reason: issueReason });
    } catch (error) {
      const issueReason = `Image URL fetch failed: ${
        error instanceof Error ? error.message : String(error)
      }`;
      checkedUrls.set(imageUrl, issueReason);
      issues.push({ field, url: imageUrl, reason: issueReason });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function assertValidSocialPreviewMetadata(html: string): void {
  const result = validateSocialPreviewMetadata(html);

  if (!result.valid) {
    const detail = result.issues
      .map(issue => `${issue.field}: ${issue.reason}`)
      .join("; ");
    throw new Error(`Invalid social preview metadata: ${detail}`);
  }
}
