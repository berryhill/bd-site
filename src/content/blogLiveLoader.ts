import path from "node:path";
import type { BlogStore } from "@/content/blogStore";
import { parseBlogSource } from "@/content/blogSchema";
import { getBlogStore } from "@/content/blogStoreFactory";
import { assertValidBlogVisualAssets } from "@/utils/blogVisualAssets";

interface FilterOptions {
  id?: string;
  draft?: boolean;
  [key: string]: unknown;
}

interface BlogLiveLoaderOptions {
  store?: BlogStore;
  publicDir?: string;
}

interface LiveEntry {
  id: string;
  data: Record<string, unknown>;
  body: string;
  filePath: string;
}

export function blogLiveLoader(options: BlogLiveLoaderOptions = {}) {
  const store = options.store ?? getBlogStore();
  const publicDir = options.publicDir ?? path.resolve("public");

  const toEntry = (post: Awaited<ReturnType<BlogStore["getPost"]>>) => {
    if (!post) return null;
    const parsed = parseBlogSource(post.source);
    try {
      assertValidBlogVisualAssets(parsed.content, {
        postSlug: post.slug,
        publicDir,
      });
    } catch (error) {
      // A bad visual reference remains visible for repair; storage failures do not.
      // eslint-disable-next-line no-console
      console.error(`Blog visual validation failed for ${post.slug}:`, error);
    }
    return {
      id: post.slug,
      data: parsed.data,
      body: parsed.content,
      filePath: `${post.slug}.md`,
    } satisfies LiveEntry;
  };

  return {
    name: "blog-store-loader",

    async loadCollection({ filter }: { filter?: FilterOptions } = {}) {
      const snapshot = await store.snapshot();
      const entries = (
        await Promise.all((await store.listPosts(snapshot)).map(toEntry))
      ).filter((entry): entry is LiveEntry => entry !== null);
      return {
        entries: entries.filter(entry => {
          if (!filter) return true;
          return Object.entries(filter).every(([key, value]) => {
            if (value === undefined) return true;
            if (key === "id") return entry.id === value;
            return entry.data[key] === value;
          });
        }),
      };
    },

    async loadEntry({ filter }: { filter?: string | FilterOptions } = {}) {
      if (typeof filter === "string") {
        const entry = toEntry(await store.getPost(filter));
        return entry ?? { error: new Error(`Entry not found: ${filter}`) };
      }
      if (filter && typeof filter.id === "string") {
        const entry = toEntry(await store.getPost(filter.id));
        if (!entry)
          return { error: new Error(`Entry not found: ${filter.id}`) };
        return Object.entries(filter).every(([key, value]) => {
          if (value === undefined || key === "id") return true;
          return entry.data[key] === value;
        })
          ? entry
          : { error: new Error("Entry not found matching filter") };
      }
      if (filter) {
        const { entries } = await this.loadCollection({ filter });
        return (
          entries[0] ?? { error: new Error("Entry not found matching filter") }
        );
      }
      return { error: new Error("Invalid filter provided to loadEntry") };
    },
  };
}
