type HomepagePost = {
  body?: string;
  data: {
    featured?: boolean;
  };
};

export function selectHomepagePosts<const Post extends HomepagePost>(
  posts: Post[] = []
) {
  const featuredPosts = posts.filter(({ data }) => data.featured).slice(0, 4);
  const recentPosts = posts.filter(({ data }) => !data.featured).slice(0, 4);

  return { featuredPosts, recentPosts };
}

export function getPostWordCount(post: Pick<HomepagePost, "body">) {
  return (post.body || "").trim().split(/\s+/).filter(Boolean).length;
}

export function getReadMinutes(post: Pick<HomepagePost, "body">) {
  return Math.max(1, Math.round(getPostWordCount(post) / 220));
}

export function formatHomepageDate(value: Date | string | undefined | null) {
  if (!value) return "pending";

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? "pending"
    : date.toISOString().slice(0, 10);
}
