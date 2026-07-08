import { submitSitemapToGoogleSearchConsole } from "./googleSearchConsole";
import { submitDuckDuckGoCrawlSignal } from "./duckDuckGoCrawlSignal";
import { submitToIndexNow } from "./indexnow";

export interface PublicPostCrawlSignalResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  indexNow?: boolean;
  duckDuckGo?: Awaited<ReturnType<typeof submitDuckDuckGoCrawlSignal>>;
  google?: Awaited<ReturnType<typeof submitSitemapToGoogleSearchConsole>>;
}

interface PublicPostCrawlSignalDeps {
  submitIndexNow?: typeof submitToIndexNow;
  submitDuckDuckGo?: typeof submitDuckDuckGoCrawlSignal;
  submitGoogleSitemap?: typeof submitSitemapToGoogleSearchConsole;
}

export async function submitPublicPostCrawlSignals(
  postUrl: string,
  options?: {
    isDraft?: boolean;
    deps?: PublicPostCrawlSignalDeps;
  }
): Promise<PublicPostCrawlSignalResult> {
  if (options?.isDraft) {
    return {
      ok: true,
      skipped: true,
      reason: "draft",
    };
  }

  const submitIndexNow = options?.deps?.submitIndexNow ?? submitToIndexNow;
  const submitDuckDuckGo =
    options?.deps?.submitDuckDuckGo ?? submitDuckDuckGoCrawlSignal;
  const submitGoogleSitemap =
    options?.deps?.submitGoogleSitemap ?? submitSitemapToGoogleSearchConsole;

  const [indexNow, google] = await Promise.all([
    submitIndexNow(postUrl),
    submitGoogleSitemap(),
  ]);

  const duckDuckGo = await submitDuckDuckGo(postUrl, {
    indexNowSubmitted: indexNow,
  });

  return {
    ok:
      indexNow &&
      (google.ok || google.skipped === true) &&
      (duckDuckGo.ok || duckDuckGo.mode === "skipped"),
    indexNow,
    duckDuckGo,
    google,
  };
}
