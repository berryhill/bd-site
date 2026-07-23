type StringMap = Record<string, unknown>;

export type EditorialMappingStatus =
  | "ga4_joined"
  | "no_data_in_window"
  | "phantom";

export type EditorialMetadataStatus =
  | "editorial_joined"
  | "editorial_metadata_missing";

export interface NormalizedGa4ArticlePath {
  slug: string;
  path: `/posts/${string}/`;
}

export interface LivePostInput extends StringMap {
  id?: string;
  slug?: string;
  path?: string;
  canonicalPath?: string;
  title?: string;
  tags?: string[];
  data?: {
    title?: string;
    tags?: string[];
    draft?: boolean;
  };
}

export interface CanonicalLivePost {
  slug: string;
  canonicalPath: `/posts/${string}/`;
  title?: string;
  tags: string[];
  primaryTag?: string;
  source: "live_inventory";
}

export interface Ga4RowInput extends StringMap {
  path?: string;
  pagePath?: string;
  pageLocation?: string;
  url?: string;
  slug?: string;
  views?: number;
  users?: number;
}

export interface EditorialRecordInput extends StringMap {
  slug?: string;
  path?: string;
  canonicalPath?: string;
}

export interface JoinedEditorialAnalyticsRow {
  slug: string;
  canonicalPath: `/posts/${string}/`;
  title?: string;
  primaryTag?: string;
  mappingStatus: EditorialMappingStatus;
  editorialStatus: EditorialMetadataStatus;
  ga4?: Ga4RowInput;
  editorial?: EditorialRecordInput;
}

export interface PhantomGa4Row {
  slug: string;
  canonicalPath: `/posts/${string}/`;
  mappingStatus: "phantom";
  ga4: Ga4RowInput;
}

export interface JoinedEditorialAnalyticsModel {
  generatedAt?: string;
  ga4MeasuredAt?: string;
  rows: JoinedEditorialAnalyticsRow[];
  phantoms: PhantomGa4Row[];
  summary: {
    liveInventoryTotal: number;
    joinedLiveRows: number;
    ga4MeasuredAt?: string;
    generatedAt?: string;
    mappingBreakdown: Record<EditorialMappingStatus, number>;
    editorialBreakdown: Record<EditorialMetadataStatus, number>;
    phantomCount: number;
  };
}

const SYSTEM_ROUTE_PATTERNS = [
  /^\/$/,
  /^\/posts\/?$/,
  /^\/posts\/page\/\d+\/?$/,
  /^\/api(?:\/|$)/,
  /^\/tags(?:\/|$)/,
  /^\/search\/?$/,
  /^\/archives\/?$/,
  /^\/(?:rss|atom|feed)\.xml$/,
  /^\/sitemap(?:-[\w-]+)?\.xml$/,
  /^\/robots\.txt$/,
  /^\/llms\.txt$/,
  /^\/og\.png$/,
  /^\/_astro(?:\/|$)/,
  /^\/pagefind(?:\/|$)/,
];

function isBlank(
  value: string | null | undefined
): value is null | undefined | "" {
  return value === null || value === undefined || value.trim() === "";
}

function normalizePathname(pathOrUrl: string): string | null {
  if (isBlank(pathOrUrl)) return null;

  try {
    const url = new URL(pathOrUrl, "https://berryhill.dev/");
    return url.pathname.replace(/\/{2,}/g, "/");
  } catch {
    return null;
  }
}

export function normalizeGa4ArticlePath(
  pathOrUrl: string | null | undefined
): NormalizedGa4ArticlePath | null {
  if (isBlank(pathOrUrl)) return null;

  const pathname = normalizePathname(pathOrUrl);
  if (!pathname) return null;

  if (SYSTEM_ROUTE_PATTERNS.some(pattern => pattern.test(pathname))) {
    return null;
  }

  const match = pathname.match(/^\/posts\/([^/]+)\/?$/);
  if (!match) return null;

  let slug: string;
  try {
    slug = decodeURIComponent(match[1] ?? "").trim();
  } catch {
    return null;
  }

  if (!slug || slug === "page" || /[/?#]/.test(slug)) return null;

  return {
    slug,
    path: `/posts/${slug}/`,
  };
}

function livePostPathCandidate(post: LivePostInput): string | undefined {
  return post.canonicalPath ?? post.path ?? post.slug ?? post.id;
}

export function buildCanonicalLivePostInventory(
  posts: LivePostInput[]
): CanonicalLivePost[] {
  const seen = new Set<string>();
  const inventory: CanonicalLivePost[] = [];

  for (const post of posts) {
    if (post.data?.draft === true) continue;

    const candidate = livePostPathCandidate(post);
    const normalized = normalizeGa4ArticlePath(
      candidate?.startsWith("/posts/") ? candidate : `/posts/${candidate ?? ""}`
    );

    if (!normalized || seen.has(normalized.slug)) continue;

    const tags = post.tags ?? post.data?.tags ?? [];
    seen.add(normalized.slug);
    inventory.push({
      slug: normalized.slug,
      canonicalPath: normalized.path,
      title: post.title ?? post.data?.title,
      tags,
      primaryTag: tags[0],
      source: "live_inventory",
    });
  }

  return inventory;
}

function ga4PathCandidate(row: Ga4RowInput): string | undefined {
  return row.path ?? row.pagePath ?? row.pageLocation ?? row.url ?? row.slug;
}

function editorialPathCandidate(
  record: EditorialRecordInput
): string | undefined {
  return record.canonicalPath ?? record.path ?? record.slug;
}

export function joinGa4EditorialMappings({
  livePosts,
  ga4Rows,
  editorialRecords = [],
  ga4MeasuredAt,
  generatedAt,
}: {
  livePosts: LivePostInput[];
  ga4Rows: Ga4RowInput[];
  editorialRecords?: EditorialRecordInput[];
  ga4MeasuredAt?: string;
  generatedAt?: string;
}): JoinedEditorialAnalyticsModel {
  const inventory = buildCanonicalLivePostInventory(livePosts);
  const liveSlugs = new Set(inventory.map(post => post.slug));
  const ga4BySlug = new Map<string, Ga4RowInput>();
  const editorialBySlug = new Map<string, EditorialRecordInput>();

  for (const row of ga4Rows) {
    const candidate = ga4PathCandidate(row);
    const normalized = normalizeGa4ArticlePath(
      candidate?.startsWith("/posts/") || candidate?.startsWith("http")
        ? candidate
        : `/posts/${candidate ?? ""}`
    );
    if (!normalized || ga4BySlug.has(normalized.slug)) continue;
    ga4BySlug.set(normalized.slug, row);
  }

  for (const record of editorialRecords) {
    const candidate = editorialPathCandidate(record);
    const normalized = normalizeGa4ArticlePath(
      candidate?.startsWith("/posts/") || candidate?.startsWith("http")
        ? candidate
        : `/posts/${candidate ?? ""}`
    );
    if (!normalized || editorialBySlug.has(normalized.slug)) continue;
    editorialBySlug.set(normalized.slug, record);
  }

  const rows = inventory.map(post => {
    const ga4 = ga4BySlug.get(post.slug);
    const editorial = editorialBySlug.get(post.slug);

    return {
      slug: post.slug,
      canonicalPath: post.canonicalPath,
      title: post.title,
      primaryTag: post.primaryTag,
      mappingStatus: ga4 ? "ga4_joined" : "no_data_in_window",
      editorialStatus: editorial
        ? "editorial_joined"
        : "editorial_metadata_missing",
      ga4,
      editorial,
    } satisfies JoinedEditorialAnalyticsRow;
  });

  const phantoms = Array.from(ga4BySlug.entries())
    .filter(([slug]) => !liveSlugs.has(slug))
    .map(([slug, ga4]) => ({
      slug,
      canonicalPath: `/posts/${slug}/` as `/posts/${string}/`,
      mappingStatus: "phantom" as const,
      ga4,
    }));

  const mappingBreakdown: Record<EditorialMappingStatus, number> = {
    ga4_joined: 0,
    no_data_in_window: 0,
    phantom: phantoms.length,
  };
  const editorialBreakdown: Record<EditorialMetadataStatus, number> = {
    editorial_joined: 0,
    editorial_metadata_missing: 0,
  };

  for (const row of rows) {
    mappingBreakdown[row.mappingStatus] += 1;
    editorialBreakdown[row.editorialStatus] += 1;
  }

  return {
    generatedAt,
    ga4MeasuredAt,
    rows,
    phantoms,
    summary: {
      liveInventoryTotal: inventory.length,
      joinedLiveRows: rows.length,
      ga4MeasuredAt,
      generatedAt,
      mappingBreakdown,
      editorialBreakdown,
      phantomCount: phantoms.length,
    },
  };
}
