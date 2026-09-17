import { isPublishTimePassed } from "./postFilter";
import { waitForSocialPreviewReadiness } from "./socialPreviewReadiness";
import { submitPublicPostCrawlSignals } from "./publicPostCrawlSignals";

export async function postPublicationSignals(
  url: string,
  metadata: { draft?: unknown; pubDatetime?: unknown },
  deps = {
    social: waitForSocialPreviewReadiness,
    crawl: submitPublicPostCrawlSignals,
  }
) {
  if (
    metadata.draft ||
    !isPublishTimePassed({
      data: { pubDatetime: new Date(metadata.pubDatetime as string) },
    } as Parameters<typeof isPublishTimePassed>[0])
  ) {
    return { socialPreviewReadiness: undefined, crawlSignals: undefined };
  }
  // Social cards are an independent publishing concern, not a crawler gate.
  const [social, crawl] = await Promise.allSettled([
    Promise.resolve().then(() => deps.social(url)),
    Promise.resolve().then(() => deps.crawl(url)),
  ]);
  return {
    socialPreviewReadiness:
      social.status === "fulfilled" ? social.value : undefined,
    crawlSignals:
      crawl.status === "fulfilled"
        ? crawl.value
        : { ok: false, reason: "crawl_signal_error" },
  };
}
