import { SITE } from "../config.ts";

export const DEFAULT_MAX_RENDERED_TITLE_LENGTH = 65;
export const DEFAULT_TITLE_SIMILARITY_THRESHOLD = 0.86;
export const DEFAULT_RECENT_TITLE_COMPARISON_LIMIT = 20;

export type TitleQualityPost = {
  slug?: string;
  route?: string | null;
  title: string;
  draft?: boolean;
  pubDatetime?: string | Date | null;
  published?: boolean;
};

export type PostTitleQualityOptions = {
  siteTitle?: string;
  maxRenderedTitleLength?: number;
  similarityThreshold?: number;
  recentComparisonLimit?: number;
  currentSlug?: string;
  now?: Date | number;
  scheduledPostMargin?: number;
};

export type PostTitleQualityIssue =
  | {
      code: "rendered_title_too_long";
      severity: "error";
      message: string;
      title: string;
      renderedTitle: string;
      renderedTitleLength: number;
      maxRenderedTitleLength: number;
    }
  | {
      code: "near_duplicate_title";
      severity: "error";
      message: string;
      title: string;
      normalizedTitle: string;
      threshold: number;
      matches: TitleSimilarityMatch[];
    };

export type TitleSimilarityMatch = {
  slug?: string;
  route?: string | null;
  title: string;
  normalizedTitle: string;
  similarity: number;
  pubDatetime?: string | Date | null;
};

const getTime = (value: Date | number | undefined) => {
  if (value === undefined) return Date.now();
  return value instanceof Date ? value.getTime() : value;
};

export function renderPostTitleTag(
  title: string,
  siteTitle: string = SITE.title
) {
  return `${title.trim()} | ${siteTitle}`;
}

export function getRenderedPostTitleLength(
  title: string,
  siteTitle: string = SITE.title
) {
  return renderPostTitleTag(title, siteTitle).length;
}

export function normalizePostTitleForComparison(title: string) {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function bigrams(value: string) {
  const compact = value.replace(/\s+/g, " ");
  if (compact.length < 2) return compact ? [compact] : [];
  const grams: string[] = [];
  for (let index = 0; index < compact.length - 1; index += 1) {
    grams.push(compact.slice(index, index + 2));
  }
  return grams;
}

export function calculatePostTitleSimilarity(
  firstTitle: string,
  secondTitle: string
) {
  const first = normalizePostTitleForComparison(firstTitle);
  const second = normalizePostTitleForComparison(secondTitle);

  if (!first || !second) return 0;
  if (first === second) return 1;

  const firstBigrams = bigrams(first);
  const secondCounts = new Map<string, number>();
  for (const gram of bigrams(second)) {
    secondCounts.set(gram, (secondCounts.get(gram) ?? 0) + 1);
  }

  let intersection = 0;
  for (const gram of firstBigrams) {
    const count = secondCounts.get(gram) ?? 0;
    if (count > 0) {
      intersection += 1;
      secondCounts.set(gram, count - 1);
    }
  }

  return (2 * intersection) / (firstBigrams.length + bigrams(second).length);
}

export function isPublicTitleComparisonPost(
  post: TitleQualityPost,
  {
    now,
    scheduledPostMargin = SITE.scheduledPostMargin,
  }: Pick<PostTitleQualityOptions, "now" | "scheduledPostMargin"> = {}
) {
  if (post.published !== undefined) return post.published;
  if (post.draft) return false;

  const publishTime = new Date(post.pubDatetime ?? 0).getTime();
  return (
    Number.isFinite(publishTime) &&
    getTime(now) > publishTime - scheduledPostMargin
  );
}

export function getRecentPublicTitleComparisonPosts(
  posts: TitleQualityPost[],
  options: PostTitleQualityOptions = {}
) {
  const limit =
    options.recentComparisonLimit ?? DEFAULT_RECENT_TITLE_COMPARISON_LIMIT;
  const currentSlug = options.currentSlug;

  return posts
    .filter(post => post.title)
    .filter(post => !currentSlug || post.slug !== currentSlug)
    .filter(post => isPublicTitleComparisonPost(post, options))
    .sort((a, b) => {
      const aTime = new Date(a.pubDatetime ?? 0).getTime();
      const bTime = new Date(b.pubDatetime ?? 0).getTime();
      return bTime - aTime;
    })
    .slice(0, limit);
}

export function findNearDuplicatePostTitles(
  title: string,
  posts: TitleQualityPost[],
  options: PostTitleQualityOptions = {}
) {
  const threshold =
    options.similarityThreshold ?? DEFAULT_TITLE_SIMILARITY_THRESHOLD;
  const normalizedTitle = normalizePostTitleForComparison(title);

  return getRecentPublicTitleComparisonPosts(posts, options)
    .map(post => ({
      slug: post.slug,
      route: post.route,
      title: post.title,
      normalizedTitle: normalizePostTitleForComparison(post.title),
      similarity: calculatePostTitleSimilarity(normalizedTitle, post.title),
      pubDatetime: post.pubDatetime,
    }))
    .filter(match => match.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity);
}

export function auditPostTitleQuality(
  title: string,
  comparisonPosts: TitleQualityPost[] = [],
  options: PostTitleQualityOptions = {}
) {
  const issues: PostTitleQualityIssue[] = [];
  const siteTitle = options.siteTitle ?? SITE.title;
  const maxRenderedTitleLength =
    options.maxRenderedTitleLength ?? DEFAULT_MAX_RENDERED_TITLE_LENGTH;
  const renderedTitle = renderPostTitleTag(title, siteTitle);
  const renderedTitleLength = renderedTitle.length;

  if (renderedTitleLength > maxRenderedTitleLength) {
    issues.push({
      code: "rendered_title_too_long",
      severity: "error",
      message: `Rendered title tag is ${renderedTitleLength} characters; keep it at or below ${maxRenderedTitleLength}.`,
      title,
      renderedTitle,
      renderedTitleLength,
      maxRenderedTitleLength,
    });
  }

  const matches = findNearDuplicatePostTitles(title, comparisonPosts, options);
  if (matches.length > 0) {
    const threshold =
      options.similarityThreshold ?? DEFAULT_TITLE_SIMILARITY_THRESHOLD;
    issues.push({
      code: "near_duplicate_title",
      severity: "error",
      message: `Title is too similar to ${matches.length} recent public post title(s).`,
      title,
      normalizedTitle: normalizePostTitleForComparison(title),
      threshold,
      matches,
    });
  }

  return {
    ok: issues.length === 0,
    renderedTitle,
    renderedTitleLength,
    maxRenderedTitleLength,
    issues,
  };
}
