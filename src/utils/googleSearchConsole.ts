/* eslint-disable no-console */

declare const process: {
  env: Record<string, string | undefined>;
};

export interface GoogleSearchConsoleSubmitResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  status?: number;
}

const GOOGLE_SEARCH_CONSOLE_SITEMAP_ENDPOINT =
  "https://www.googleapis.com/webmasters/v3/sites";
const DEFAULT_SITE = "https://berryhill.dev/";

const getEnv = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

const normalizeSiteUrl = (siteUrl: string): string => {
  if (siteUrl.startsWith("sc-domain:")) return siteUrl;
  return new URL(siteUrl).toString();
};

const defaultSitemapUrl = (): string =>
  new URL("/sitemap.xml", DEFAULT_SITE).toString();

export async function submitSitemapToGoogleSearchConsole(options?: {
  sitemapUrl?: string;
  siteUrl?: string;
  accessToken?: string;
}): Promise<GoogleSearchConsoleSubmitResult> {
  const accessToken =
    options?.accessToken ?? getEnv("GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN");

  if (!accessToken) {
    return {
      ok: false,
      skipped: true,
      reason: "missing_config: GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN",
    };
  }

  const siteUrl =
    options?.siteUrl ??
    getEnv("GOOGLE_SEARCH_CONSOLE_SITE_URL") ??
    DEFAULT_SITE;
  const sitemapUrl =
    options?.sitemapUrl ??
    getEnv("GOOGLE_SEARCH_CONSOLE_SITEMAP_URL") ??
    defaultSitemapUrl();

  try {
    const endpoint = `${GOOGLE_SEARCH_CONSOLE_SITEMAP_ENDPOINT}/${encodeURIComponent(normalizeSiteUrl(siteUrl))}/sitemaps/${encodeURIComponent(new URL(sitemapUrl).toString())}`;
    const response = await fetch(endpoint, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.warn("Google Search Console sitemap submission failed", {
        status: response.status,
        sitemapUrl,
        siteUrl,
      });
    }

    return {
      ok: response.ok,
      status: response.status,
    };
  } catch (error) {
    console.warn("Google Search Console sitemap submission errored", {
      error: error instanceof Error ? error.message : String(error),
      sitemapUrl,
      siteUrl,
    });

    return {
      ok: false,
      reason: error instanceof Error ? error.message : "unknown_error",
    };
  }
}
