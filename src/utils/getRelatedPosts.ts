import type { CollectionEntry } from "astro:content";
import { slugifyAll } from "./slugify";

/**
 * Get related posts based on shared tags.
 * @param currentPost - the post being viewed
 * @param allPosts - all available posts (should be pre-filtered)
 * @param limit - max number of related posts to return (default 3)
 * @returns related posts sorted by tag overlap score, limited to `limit`
 */
export function getRelatedPosts(
  currentPost: CollectionEntry<"liveBlog">,
  allPosts: CollectionEntry<"liveBlog">[],
  limit = 3
): CollectionEntry<"liveBlog">[] {
  const currentTags = new Set(slugifyAll(currentPost.data.tags ?? []));

  return allPosts
    .filter(post => {
      // Exclude self
      if (post.id === currentPost.id) return false;
      // Only published posts (no drafts)
      if (post.data.draft) return false;
      // Must share at least one tag
      const postTags = slugifyAll(post.data.tags ?? []);
      return postTags.some(tag => currentTags.has(tag));
    })
    .map(post => {
      // Score = number of shared tags
      const postTags = slugifyAll(post.data.tags ?? []);
      const score = postTags.filter(tag => currentTags.has(tag)).length;
      return { post, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ post }) => post);
}
