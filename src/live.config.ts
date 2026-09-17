import { defineLiveCollection } from "astro:content";
import { blogLiveLoader } from "@/content/blogLiveLoader";
import { blogMetadataSchema } from "@/content/blogMetadata";

const liveBlog = defineLiveCollection({
  loader: blogLiveLoader(),
  schema: blogMetadataSchema,
});

export const collections = { liveBlog };
