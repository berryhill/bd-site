import path from "node:path";
import { BLOG_PATH } from "@/content.config";
import type { BlogStore } from "@/content/blogStore";
import { BlogStoreValidationError } from "@/content/blogStore";
import { FilesystemBlogStore } from "@/content/filesystemBlogStore";
import { createS3BlogStore } from "@/content/s3BlogStore";

let sharedStore: BlogStore | undefined;

export function createBlogStore(
  mode = process.env.CONTENT_STORAGE_MODE ?? "filesystem"
): BlogStore {
  if (mode === "filesystem") {
    const baseDir = process.env.CONTENT_STORAGE_FILESYSTEM_PATH ?? BLOG_PATH;
    return new FilesystemBlogStore({ baseDir: path.resolve(baseDir) });
  }
  if (mode === "object") return createS3BlogStore();
  throw new BlogStoreValidationError(
    `Unsupported CONTENT_STORAGE_MODE: ${mode}`
  );
}

export function getBlogStoreDiagnostics(
  mode = process.env.CONTENT_STORAGE_MODE ?? "filesystem"
): { provider: "filesystem" | "object" | "unknown" } {
  if (mode === "filesystem" || mode === "object") return { provider: mode };
  return { provider: "unknown" };
}

export function getBlogStore(): BlogStore {
  sharedStore ??= createBlogStore();
  return sharedStore;
}
