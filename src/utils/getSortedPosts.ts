import type { CollectionEntry } from "astro:content";
import { getPublicPosts } from "./postFilter.ts";

const getSortedPosts = (posts: CollectionEntry<"liveBlog">[]) => {
  return getPublicPosts(posts).sort((a, b) => {
    const timestampA = new Date(a.data.pubDatetime).getTime();
    const timestampB = new Date(b.data.pubDatetime).getTime();

    if (timestampA !== timestampB) return timestampB - timestampA;

    return a.id.localeCompare(b.id);
  });
};

export default getSortedPosts;
