---
title: "Welcome to the Dynamic Blog"
description: "Testing live content collections - no rebuild required!"
pubDatetime: 2025-10-27T14:00:00Z
tags: ["test", "dynamic", "astro"]
featured: true
draft: false
---

# Welcome to Dynamic Content!

This post demonstrates the power of **live content collections** in Astro.

## What's Special?

- ✅ No rebuild required
- ✅ Add posts dynamically
- ✅ Instant updates
- ✅ Server-side rendering

## How It Works

When you add a new markdown file to `src/data/blog/`, it will appear on the site immediately on the next request. No need to run `pnpm run build` anymore!

## Testing Live Collections

Try creating a new markdown file in the blog directory and refresh the page. You should see it appear instantly!

```bash
# Add a new post
echo "---
title: My New Post
description: This is a test
pubDatetime: 2025-10-27T15:00:00Z
---

Hello World!" > src/data/blog/my-new-post.md
```

That's it - refresh and see your new post!
