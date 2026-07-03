const DEFAULT_WEBSITE = "https://berryhill.dev/";

function isBlank(
  value: string | null | undefined
): value is null | undefined | "" {
  return value === null || value === undefined || value.trim() === "";
}

function toSiteBaseUrl(website: string): URL {
  if (isBlank(website)) {
    throw new TypeError("SITE.website must be a non-empty absolute URL");
  }

  const base = new URL(website);
  base.pathname = `${base.pathname.replace(/\/+$/, "")}/`;
  base.search = "";
  base.hash = "";
  return base;
}

function ensureTrailingSlash(pathname: string) {
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

export function normalizeSiteWebsite(website = DEFAULT_WEBSITE): string {
  return toSiteBaseUrl(website).href;
}

export function toAbsoluteSiteUrl(
  pathOrUrl: string | URL,
  website = DEFAULT_WEBSITE,
  options: { trailingSlash?: boolean } = {}
): string {
  const value = pathOrUrl instanceof URL ? pathOrUrl.href : pathOrUrl.trim();

  if (isBlank(value)) {
    throw new TypeError("URL path must be non-empty");
  }

  const url = new URL(value, toSiteBaseUrl(website));

  if (options.trailingSlash && !url.pathname.match(/\.[^/]+$/)) {
    url.pathname = ensureTrailingSlash(url.pathname);
  }

  return url.href;
}

export function toPostUrl(
  pathOrSlug: string,
  website = DEFAULT_WEBSITE
): string {
  const value = pathOrSlug.trim();

  if (isBlank(value)) {
    throw new TypeError("Post path or slug must be non-empty");
  }

  if (/^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith("//")) {
    return toAbsoluteSiteUrl(value, website, { trailingSlash: true });
  }

  const normalizedPath = value
    .replace(/^\/+/, "")
    .replace(/^posts\/+/, "posts/");
  const postPath = normalizedPath.startsWith("posts/")
    ? normalizedPath
    : `posts/${normalizedPath}`;

  return toAbsoluteSiteUrl(postPath, website, { trailingSlash: true });
}

export function toPostAssetUrl(
  postPathOrSlug: string,
  assetPath: string,
  website = DEFAULT_WEBSITE
): string {
  const postUrl = toPostUrl(postPathOrSlug, website);
  return toAbsoluteSiteUrl(assetPath, postUrl);
}
