import { submitSitemapToGoogleSearchConsole } from "./googleSearchConsole";
import { submitToIndexNow } from "./indexnow";

export interface PublicPostCrawlSignalResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  indexNow?: boolean;
  google?: Awaited<ReturnType<typeof submitSitemapToGoogleSearchConsole>>;
}

interface PublicPostCrawlSignalDeps {
  submitIndexNow?: typeof submitToIndexNow;
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
  const submitGoogleSitemap =
    options?.deps?.submitGoogleSitemap ?? submitSitemapToGoogleSearchConsole;

  const [indexNow, google] = await Promise.all([
    submitIndexNow(postUrl),
    submitGoogleSitemap(),
  ]);

  return {
    ok: indexNow && (google.ok || google.skipped === true),
    indexNow,
    google,
  };
}
