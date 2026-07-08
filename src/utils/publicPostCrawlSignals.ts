import { submitSitemapToGoogleSearchConsole } from "./googleSearchConsole";
import { submitToIndexNow } from "./indexnow";
import { submitYahooPostCrawlSignal } from "./yahooPostCrawlSignals";

export interface PublicPostCrawlSignalResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  indexNow?: boolean;
  google?: Awaited<ReturnType<typeof submitSitemapToGoogleSearchConsole>>;
  yahoo?: Awaited<ReturnType<typeof submitYahooPostCrawlSignal>>;
}

interface PublicPostCrawlSignalDeps {
  submitIndexNow?: typeof submitToIndexNow;
  submitGoogleSitemap?: typeof submitSitemapToGoogleSearchConsole;
  submitYahoo?: typeof submitYahooPostCrawlSignal;
}

export async function submitPublicPostCrawlSignals(
  postUrl: string,
  options?: {
    isDraft?: boolean;
    deps?: PublicPostCrawlSignalDeps;
  }
): Promise<PublicPostCrawlSignalResult> {
  const submitYahoo = options?.deps?.submitYahoo ?? submitYahooPostCrawlSignal;

  if (options?.isDraft) {
    const yahoo = await submitYahoo(postUrl, { isDraft: true });

    return {
      ok: true,
      skipped: true,
      reason: "draft",
      yahoo,
    };
  }

  const submitIndexNow = options?.deps?.submitIndexNow ?? submitToIndexNow;
  const submitGoogleSitemap =
    options?.deps?.submitGoogleSitemap ?? submitSitemapToGoogleSearchConsole;

  try {
    const [indexNow, google] = await Promise.all([
      submitIndexNow(postUrl),
      submitGoogleSitemap(),
    ]);
    const yahoo = await submitYahoo(postUrl, { indexNowResult: indexNow });

    return {
      ok: indexNow && (google.ok || google.skipped === true),
      indexNow,
      google,
      yahoo,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown_error";
    const yahoo = await submitYahoo(postUrl, {
      indexNowResult: false,
    });

    return {
      ok: false,
      reason,
      yahoo,
    };
  }
}
