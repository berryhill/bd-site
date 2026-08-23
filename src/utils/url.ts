const DEFAULT_WEBSITE = "https://berryhill.dev/";
const FILE_EXTENSION_PATH_RE = /\/[^/]+\.[^/]+$/;
const CANONICAL_HTML_REDIRECT_METHODS = new Set(["GET", "HEAD"]);
const PAGE_ONE_ARCHIVE_PATH_RE = /^\/posts\/page\/1\/?$/;
const PAGE_ONE_ARCHIVE_TARGET = "/posts/";

function isBlank(
  value: string | null | undefined
): value is null | undefined | "" {
  return value === null || value === undefined || value.trim() === "";
}

function toSiteBaseUrl(website: string | URL): URL {
  if (typeof website === "string" && isBlank(website)) {
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

function isApiPath(pathname: string) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export function isFileLikePathname(pathname: string): boolean {
  return FILE_EXTENSION_PATH_RE.test(pathname);
}

export function shouldEnforceTrailingSlash(pathname: string): boolean {
  return (
    pathname !== "/" &&
    !pathname.endsWith("/") &&
    !isApiPath(pathname) &&
    !isFileLikePathname(pathname)
  );
}

export function getAlternateHtmlPathname(pathname: string): string | null {
  if (pathname === "/" || isApiPath(pathname) || isFileLikePathname(pathname)) {
    return null;
  }

  return pathname.endsWith("/")
    ? pathname.replace(/\/+$/, "")
    : ensureTrailingSlash(pathname);
}

export function normalizeCanonicalHtmlUrl(
  pathOrUrl: string | URL,
  base: string | URL = DEFAULT_WEBSITE
): URL {
  const url = new URL(pathOrUrl, toSiteBaseUrl(base));

  if (shouldEnforceTrailingSlash(url.pathname)) {
    url.pathname = ensureTrailingSlash(url.pathname);
  }

  return url;
}

export function acceptsHtmlResponse(
  acceptHeader: string | null | undefined
): boolean {
  if (isBlank(acceptHeader)) return true;

  return acceptHeader.split(",").some(value => {
    const [mimeType = "", ...params] = value.split(";");
    const q = params
      .map(param => param.trim().match(/^q=(\d*(?:\.\d+)?)$/i)?.[1])
      .find(Boolean);

    if (q !== undefined && Number(q) <= 0) {
      return false;
    }

    const normalizedMimeType = mimeType.trim().toLowerCase();
    return (
      normalizedMimeType === "text/html" ||
      normalizedMimeType === "application/xhtml+xml" ||
      normalizedMimeType === "text/*" ||
      normalizedMimeType === "*/*"
    );
  });
}

export function getCanonicalHtmlRedirectLocation(
  method: string,
  requestUrl: string | URL,
  acceptHeader?: string | null,
  base: string | URL = DEFAULT_WEBSITE
): string | null {
  if (!CANONICAL_HTML_REDIRECT_METHODS.has(method.toUpperCase())) {
    return null;
  }

  if (!acceptsHtmlResponse(acceptHeader)) {
    return null;
  }

  const url = new URL(requestUrl, toSiteBaseUrl(base));
  const canonicalUrl = normalizeCanonicalHtmlUrl(url, base);

  if (canonicalUrl.pathname === url.pathname) {
    return null;
  }

  return `${canonicalUrl.pathname}${canonicalUrl.search}${canonicalUrl.hash}`;
}

export function getPageOneArchiveRedirectLocation(
  method: string,
  requestUrl: string | URL,
  acceptHeader?: string | null,
  base: string | URL = DEFAULT_WEBSITE
): string | null {
  if (!CANONICAL_HTML_REDIRECT_METHODS.has(method.toUpperCase())) {
    return null;
  }

  if (!acceptsHtmlResponse(acceptHeader)) {
    return null;
  }

  const url = new URL(requestUrl, toSiteBaseUrl(base));

  if (!PAGE_ONE_ARCHIVE_PATH_RE.test(url.pathname)) {
    return null;
  }

  return `${PAGE_ONE_ARCHIVE_TARGET}${url.search}${url.hash}`;
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
