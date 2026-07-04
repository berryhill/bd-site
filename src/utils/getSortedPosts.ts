import type { CollectionEntry } from "astro:content";
import { getPublicPosts } from "./postFilter";

const getSortedPosts = (posts: CollectionEntry<"liveBlog">[]) => {
  return getPublicPosts(posts).sort(
    (a, b) =>
      Math.floor(
        new Date(b.data.modDatetime ?? b.data.pubDatetime).getTime() / 1000
      ) -
      Math.floor(
        new Date(a.data.modDatetime ?? a.data.pubDatetime).getTime() / 1000
      )
  );
};

export default getSortedPosts;
