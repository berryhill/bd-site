import path from "node:path";
import { BLOG_PATH } from "@/content.config";
import type { BlogStore } from "@/content/blogStore";
import { BlogStoreValidationError } from "@/content/blogStore";
import { FilesystemBlogStore } from "@/content/filesystemBlogStore";
import {
  FilesystemMirrorEvidenceJournal,
  MirrorBlogStore,
} from "@/content/mirrorBlogStore";
import { createS3BlogStore } from "@/content/s3BlogStore";

export type BlogStorageMode =
  | "filesystem"
  | "object"
  | "filesystem-mirror"
  | "object-mirror";

let sharedStore: BlogStore | undefined;

export function createBlogStore(
  mode = process.env.CONTENT_STORAGE_MODE ?? "filesystem"
): BlogStore {
  const baseDir = path.resolve(
    process.env.CONTENT_STORAGE_FILESYSTEM_PATH ?? BLOG_PATH
  );
  if (mode === "filesystem") return new FilesystemBlogStore({ baseDir });
  if (mode === "object") return createS3BlogStore();
  if (mode === "filesystem-mirror" || mode === "object-mirror") {
    const filesystem = new FilesystemBlogStore({ baseDir });
    const object = createS3BlogStore();
    const journal = new FilesystemMirrorEvidenceJournal(
      path.resolve(
        process.env.CONTENT_MIRROR_RECONCILIATION_PATH ??
          path.join(baseDir, ".blogstore-reconciliation")
      )
    );
    return mode === "filesystem-mirror"
      ? new MirrorBlogStore(filesystem, object, "filesystem", journal)
      : new MirrorBlogStore(object, filesystem, "object", journal);
  }
  throw new BlogStoreValidationError(
    `Unsupported CONTENT_STORAGE_MODE: ${mode}`
  );
}

export function getBlogStoreDiagnostics(
  mode = process.env.CONTENT_STORAGE_MODE ?? "filesystem"
): {
  mode: string;
  provider: "filesystem" | "object" | "unknown";
  mirror?: {
    authority: "filesystem" | "object";
    secondary: "filesystem" | "object";
  };
} {
  if (mode === "filesystem" || mode === "object") {
    return { mode, provider: mode };
  }
  if (mode === "filesystem-mirror") {
    return {
      mode,
      provider: "filesystem",
      mirror: { authority: "filesystem", secondary: "object" },
    };
  }
  if (mode === "object-mirror") {
    return {
      mode,
      provider: "object",
      mirror: { authority: "object", secondary: "filesystem" },
    };
  }
  return { mode, provider: "unknown" };
}

export function getBlogStore(): BlogStore {
  sharedStore ??= createBlogStore();
  return sharedStore;
}
