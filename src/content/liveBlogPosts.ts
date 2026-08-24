import { getLiveCollection } from "astro:content";
import { requireLiveBlogEntries } from "@/content/publicBlogReads";

export async function getLiveBlogPosts() {
  return requireLiveBlogEntries(await getLiveCollection("liveBlog"));
}
