import { BlogStoreUnavailableError } from "@/content/blogStore";

type LiveBlogCollectionResult<TEntry> = {
  entries?: TEntry[];
  error?: unknown;
};

export function requireLiveBlogEntries<TEntry>(
  result: LiveBlogCollectionResult<TEntry>
): TEntry[] {
  if (result.error || !Array.isArray(result.entries)) {
    throw new BlogStoreUnavailableError(
      "Live blog content is unavailable",
      result.error
    );
  }

  return result.entries;
}

export function storageUnavailableResponse(): Response {
  return new Response("Blog storage is temporarily unavailable", {
    status: 503,
    statusText: "Service Unavailable",
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "Retry-After": "30",
    },
  });
}
