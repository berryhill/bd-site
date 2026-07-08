import { getCanonicalSitemapUrl } from "./crawlSignals";
import { submitToIndexNow } from "./indexnow";

export interface YahooPostCrawlSignalResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  route: "bing_indexnow_yahoo_crawl_discovery";
  searchEngine: "yahoo";
  via: "bing_webmaster_tools_indexnow";
  crawler: "Yahoo Slurp";
  endpoint: "https://www.bing.com/indexnow";
  postUrl: string;
  sitemapUrl: string;
  robotsTxt: string;
  indexNowSubmitted?: boolean;
  guaranteedIndexing: false;
}

interface YahooPostCrawlSignalDeps {
  submitIndexNow?: typeof submitToIndexNow;
}

const YAHOO_SIGNAL_BASE = {
  route: "bing_indexnow_yahoo_crawl_discovery",
  searchEngine: "yahoo",
  via: "bing_webmaster_tools_indexnow",
  crawler: "Yahoo Slurp",
  endpoint: "https://www.bing.com/indexnow",
  robotsTxt: "/robots.txt",
  guaranteedIndexing: false,
} as const;

export async function submitYahooPostCrawlSignal(
  postUrl: string,
  options?: {
    isDraft?: boolean;
    indexNowResult?: boolean;
    deps?: YahooPostCrawlSignalDeps;
  }
): Promise<YahooPostCrawlSignalResult> {
  const sitemapUrl = getCanonicalSitemapUrl();

  if (options?.isDraft) {
    return {
      ...YAHOO_SIGNAL_BASE,
      ok: true,
      skipped: true,
      reason: "draft",
      postUrl,
      sitemapUrl,
    };
  }

  try {
    const indexNowSubmitted =
      options?.indexNowResult ??
      (await (options?.deps?.submitIndexNow ?? submitToIndexNow)(postUrl));

    return {
      ...YAHOO_SIGNAL_BASE,
      ok: indexNowSubmitted,
      reason: indexNowSubmitted
        ? undefined
        : "bing_indexnow_unavailable_for_yahoo_discovery",
      postUrl,
      sitemapUrl,
      indexNowSubmitted,
    };
  } catch (error) {
    return {
      ...YAHOO_SIGNAL_BASE,
      ok: false,
      reason: error instanceof Error ? error.message : "unknown_error",
      postUrl,
      sitemapUrl,
      indexNowSubmitted: false,
    };
  }
}
