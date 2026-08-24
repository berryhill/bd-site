import { defineLiveCollection } from "astro:content";
import { z } from "astro/zod";
import { blogLiveLoader } from "@/content/blogLiveLoader";
import { SITE } from "@/config";

const liveBlog = defineLiveCollection({
  loader: blogLiveLoader(),
  schema: z.object({
    author: z.string().default(SITE.author),
    pubDatetime: z.coerce.date(),
    modDatetime: z.coerce.date().optional().nullable(),
    title: z.string(),
    featured: z.boolean().optional(),
    draft: z.boolean().optional(),
    tags: z.array(z.string()).default(["others"]),
    ogImage: z.string().optional().nullable(),
    description: z.string(),
    canonicalURL: z.string().optional().nullable(),
    hideEditPost: z.boolean().optional(),
    timezone: z.string().optional(),
  }),
});

export const collections = { liveBlog };
