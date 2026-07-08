/* eslint-disable no-console */

declare const process: {
  env: Record<string, string | undefined>;
};

const DUCKDUCKGO_RESULTS_SOURCE_URL =
  "https://duckduckgo.com/duckduckgo-help-pages/results/sources";
const DEFAULT_SITE = "https://berryhill.dev/";
const CANONICAL_SITEMAP_PATH = "sitemap.xml";
const DISABLED_ENV = "DUCKDUCKGO_CRAWL_SIGNAL_DISABLED";

export type DuckDuckGoCrawlSignalMode =
  | "covered_by_bing_indexnow"
  | "sitemap_and_crawler"
  | "skipped";

export interface DuckDuckGoCrawlSignalResult {
  provider: "duckduckgo";
  ok: boolean;
  mode: DuckDuckGoCrawlSignalMode;
  reason?: string;
  sources: string[];
  sitemapUrl?: string;
  duckDuckBotAllowed: boolean;
  indexNowSubmitted?: boolean;
}

interface DuckDuckGoCrawlSignalOptions {
  indexNowSubmitted?: boolean;
  site?: string;
  disabled?: boolean;
}

const DUCKDUCKGO_SIGNAL_SOURCES = [
  DUCKDUCKGO_RESULTS_SOURCE_URL,
  "https://www.indexnow.org/",
] as const;

const getEnv = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

const isEnvDisabled = () =>
  ["1", "true", "yes"].includes(getEnv(DISABLED_ENV)?.toLowerCase() ?? "");

export async function submitDuckDuckGoCrawlSignal(
  postUrl: string,
  options?: DuckDuckGoCrawlSignalOptions
): Promise<DuckDuckGoCrawlSignalResult> {
  const sources = [...DUCKDUCKGO_SIGNAL_SOURCES];
  const disabled = options?.disabled === true || isEnvDisabled();

  if (disabled) {
    return {
      provider: "duckduckgo",
      ok: false,
      mode: "skipped",
      reason: `disabled: ${DISABLED_ENV}`,
      sources,
      duckDuckBotAllowed: true,
      indexNowSubmitted: options?.indexNowSubmitted,
    };
  }

  const site = options?.site ?? DEFAULT_SITE;

  try {
    new URL(postUrl);
    const sitemapUrl = new URL(CANONICAL_SITEMAP_PATH, site).href;
    const indexNowSubmitted = options?.indexNowSubmitted === true;

    return {
      provider: "duckduckgo",
      ok: true,
      mode: indexNowSubmitted
        ? "covered_by_bing_indexnow"
        : "sitemap_and_crawler",
      reason: indexNowSubmitted
        ? "DuckDuckGo has no documented direct URL submission endpoint; traditional results are supported indirectly through Bing/IndexNow plus public crawl signals."
        : "DuckDuckGo has no documented direct URL submission endpoint; relying on DuckDuckBot access and canonical sitemap discovery.",
      sources,
      sitemapUrl,
      duckDuckBotAllowed: true,
      indexNowSubmitted,
    };
  } catch (error) {
    console.warn("DuckDuckGo crawl signal evaluation errored", {
      error: error instanceof Error ? error.message : String(error),
      postUrl,
    });

    return {
      provider: "duckduckgo",
      ok: false,
      mode: "skipped",
      reason: error instanceof Error ? error.message : "unknown_error",
      sources,
      duckDuckBotAllowed: true,
      indexNowSubmitted: options?.indexNowSubmitted,
    };
  }
}
