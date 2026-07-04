import type { CollectionEntry } from "astro:content";
import { SITE } from "../config.ts";

type PublicPostLike = Pick<CollectionEntry<"liveBlog">, "data"> & {
  id?: string;
  filePath?: string;
};

export type PublicPostFilterOptions = {
  now?: Date | number;
  scheduledPostMargin?: number;
};

const getTime = (value: Date | number | undefined) => {
  if (value === undefined) return Date.now();
  return value instanceof Date ? value.getTime() : value;
};

const hasPrivatePathSegment = (path: string | undefined) => {
  if (!path) return false;

  return path
    .split(/[\\/]/)
    .filter(Boolean)
    .some(segment => segment.startsWith("_"));
};

export const isIgnoredPost = (post: PublicPostLike) => {
  return hasPrivatePathSegment(post.id) || hasPrivatePathSegment(post.filePath);
};

export const isPublishTimePassed = (
  post: PublicPostLike,
  {
    now,
    scheduledPostMargin = SITE.scheduledPostMargin,
  }: PublicPostFilterOptions = {}
) => {
  const publishTime = new Date(post.data.pubDatetime).getTime();

  if (!Number.isFinite(publishTime)) return false;

  return getTime(now) > publishTime - scheduledPostMargin;
};

export const isPublicPost = (
  post: PublicPostLike,
  options: PublicPostFilterOptions = {}
) => {
  return (
    !post.data.draft &&
    !isIgnoredPost(post) &&
    isPublishTimePassed(post, options)
  );
};

export const getPublicPosts = <Post extends PublicPostLike>(
  posts: Post[],
  options: PublicPostFilterOptions = {}
) => posts.filter(post => isPublicPost(post, options));

const postFilter = (post: CollectionEntry<"liveBlog">) => {
  return isPublicPost(post);
};

export default postFilter;
