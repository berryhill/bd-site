import { defineLiveCollection } from "astro:content";
import { z } from "astro/zod";
import { filesystemLoader } from "@/loaders/filesystem";
import { SITE } from "@/config";
import { BLOG_PATH } from "@/content.config";

const liveBlog = defineLiveCollection({
  loader: filesystemLoader({
    baseDir: `./${BLOG_PATH}`,
  }),
  schema: z.object({
    author: z.string().default(SITE.author),
    pubDatetime: z.coerce.date(),
    modDatetime: z.coerce.date().optional().nullable(),
    title: z.string(),
    featured: z.boolean().optional(),
    draft: z.boolean().optional(),
    tags: z.array(z.string()).default(["others"]),
    ogImage: z.string().optional(),
    description: z.string(),
    canonicalURL: z.string().optional(),
    hideEditPost: z.boolean().optional(),
    timezone: z.string().optional(),
  }),
});

export const collections = { liveBlog };
