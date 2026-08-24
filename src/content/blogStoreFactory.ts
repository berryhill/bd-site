import path from "node:path";
import { BLOG_PATH } from "@/content.config";
import type { BlogStore } from "@/content/blogStore";
import { BlogStoreValidationError } from "@/content/blogStore";
import { FilesystemBlogStore } from "@/content/filesystemBlogStore";

let sharedStore: BlogStore | undefined;

export function createBlogStore(
  mode = process.env.CONTENT_STORAGE_MODE ?? "filesystem"
): BlogStore {
  if (mode !== "filesystem") {
    throw new BlogStoreValidationError(
      `Unsupported CONTENT_STORAGE_MODE: ${mode}. Only filesystem is available.`
    );
  }
  const baseDir = process.env.CONTENT_STORAGE_FILESYSTEM_PATH ?? BLOG_PATH;
  return new FilesystemBlogStore({ baseDir: path.resolve(baseDir) });
}

export function getBlogStore(): BlogStore {
  sharedStore ??= createBlogStore();
  return sharedStore;
}
