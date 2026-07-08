# API Endpoints

Use these endpoints to integrate with DraftFly or other platforms.

## Base URL

```
https://berryhill.dev
```

For local development:
```
http://localhost:4321
```

## 1. Validate API Key

Validate your API key credentials.

```
GET /api/auth/validate
```

**Headers:**
```
x-api-key: YOUR_API_KEY
```

**Response (200 OK):**
```json
{
  "valid": true,
  "message": "API key is valid"
}
```

**Response (401 Unauthorized):**
```json
{
  "valid": false,
  "error": "Invalid or missing API key"
}
```

**Example:**
```bash
curl https://berryhill.dev/api/auth/validate \
  -H "x-api-key: YOUR_API_KEY"
```

## 2. Health Check

Verify the API connection is working and validate your API key.

```
GET /api/health
```

**Headers:**
```
x-api-key: YOUR_API_KEY
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "message": "API is operational"
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "Unauthorized",
  "message": "Valid x-api-key header is required"
}
```

## 3. Get Posts

Retrieve a list of blog posts with optional filtering.

```
GET /api/posts
```

**Headers:**
```
x-api-key: YOUR_API_KEY
```

**Query Parameters:**
- `slug` (optional): Filter by specific post slug
- `featured` (optional): Filter by featured status (`true` or `false`)
- `draft` (optional): Filter by draft status (`true` or `false`)

**Response (200 OK):**
```json
{
  "success": true,
  "count": 1,
  "posts": [
    {
      "slug": "my-first-post",
      "title": "My First Post",
      "description": "This is my first blog post",
      "pubDatetime": "2025-01-15T10:00:00.000Z",
      "modDatetime": "2025-01-15T10:00:00.000Z",
      "featured": false,
      "draft": false,
      "tags": ["blog", "astro"],
      "ogImage": "https://example.com/image.jpg",
      "canonicalURL": "https://berryhill.dev/posts/my-first-post/",
      "hideEditPost": false,
      "timezone": "Asia/Bangkok",
      "content": "# Hello World\n\nThis is the post content..."
    }
  ]
}
```

## 4. Create Post

Create a new blog post.

```
POST /api/posts
```

**Headers:**
```
x-api-key: YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "My New Post",
  "description": "A description of my post",
  "content": "# Hello World\n\nThis is the post content...",
  "author": "Berryhill",
  "pubDatetime": "2025-01-15T10:00:00.000Z",
  "modDatetime": null,
  "tags": ["blog", "astro"],
  "featured": false,
  "draft": true,
  "ogImage": "https://example.com/image.jpg",
  "featured_image": "https://example.com/image.jpg",
  "canonicalURL": "https://berryhill.dev/posts/my-new-post/",
  "hideEditPost": false,
  "timezone": "Asia/Bangkok"
}
```

**Fields:**
- `title` (required): Post title
- `description` (required): Post description
- `content` (required): Post content in Markdown
- `author` (optional): Post author (schema defaults to site author when omitted)
- `pubDatetime` (optional): Publication datetime; defaults to the creation time when omitted
- `modDatetime` (optional): Modified datetime; can be `null`
- `tags` (optional): Array of tags (defaults to ["blog"])
- `featured` (optional): Featured status (defaults to false)
- `draft` (optional): Draft status (defaults to false)
- `ogImage` (optional): Open Graph image URL/path stored as `ogImage` in frontmatter; can be `null`
- `featured_image` (optional): Backward-compatible alias for `ogImage`; `ogImage` takes precedence when it is provided, including `null`; can be `null`
- `canonicalURL` (optional): Canonical URL for the post; can be `null`
- `hideEditPost` (optional): Hide the edit link for this post
- `timezone` (optional): IANA timezone override for datetime display

**Content image references:** POST `content` may include normal external images. Repo-backed blog visuals must be referenced as `/assets/blog/<slug>/filename.svg` or `/assets/blog/<slug>/filename.png`, include alt text plus a caption/title in Markdown, and have an existing backing file under `public/assets/blog/<slug>/`. Inline `data:image` URIs are invalid.

**Social preview behavior:** `ogImage` is written to frontmatter and becomes the rendered post's `og:image`, `twitter:image`, and JSON-LD image. Stored `ogImage` values may be absolute URLs, site-relative paths, or relative paths; rendered post metadata normalizes site-relative and relative values to absolute URLs using `SITE.website` without mutating the stored frontmatter value. `featured_image` is only a backward-compatible alias; `ogImage` wins when both are supplied. If no `ogImage` is stored and the post is not a draft, the site falls back to the dynamic `/posts/<slug>/index.png` image route when `SITE.dynamicOgImage` is enabled.

**Public crawl signal behavior:** after a successful non-draft POST write, the API submits public crawl signals for the canonical post URL and site sitemap through IndexNow plus Google Search Console sitemap resubmission, then records DuckDuckGo coverage evidence. DuckDuckGo coverage is documented as covered by Bing/IndexNow when IndexNow succeeds, or as canonical sitemap plus DuckDuckBot access when relying on crawler discovery; this implementation does not use a direct DuckDuckGo URL submission endpoint. Draft posts do not trigger crawl signals. Google Search Console submission requires a server-side `GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN`; `GOOGLE_SEARCH_CONSOLE_SITE_URL` and `GOOGLE_SEARCH_CONSOLE_SITEMAP_URL` are optional overrides. If the token is missing, Google submission is skipped without failing the post write. Set `DUCKDUCKGO_CRAWL_SIGNAL_DISABLED=true` to opt out of the DuckDuckGo coverage evaluation.

**Social preview verification:** after building or running preview, check a post page with:

```bash
pnpm run check:social-preview -- http://localhost:4321/posts/<slug>/
```

The command verifies `<title>`, meta description, Open Graph title/description/image, and Twitter card/title/description/image readback.

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Post created successfully",
  "slug": "my-new-post",
  "filename": "my-new-post.md"
}
```

## 5. Update Post

Update an existing blog post's metadata or content.

```
PATCH /api/posts
```

**Headers:**
```
x-api-key: YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**
```json
{
  "slug": "my-post-slug",
  "title": "Updated Title",
  "description": "Updated description",
  "author": "Berryhill",
  "pubDatetime": "2025-01-15T10:00:00.000Z",
  "modDatetime": "2025-01-16T10:00:00.000Z",
  "featured": true,
  "draft": false,
  "tags": ["updated", "tags"],
  "ogImage": "https://example.com/new-image.jpg",
  "featured_image": "https://example.com/new-image.jpg",
  "canonicalURL": "https://berryhill.dev/posts/my-post-slug/",
  "hideEditPost": false,
  "timezone": "Asia/Bangkok",
  "content": "# Updated Content\n\nNew post content..."
}
```

**Fields:**
- `slug` (required): The slug of the post to update
- `title` (optional): Update post title
- `description` (optional): Update post description
- `author` (optional): Update post author
- `pubDatetime` (optional): Update publication datetime
- `modDatetime` (optional): Update modified datetime; if omitted, the API sets it to the current update time
- `featured` (optional): Update featured status
- `draft` (optional): Update draft status
- `tags` (optional): Update tags array
- `ogImage` (optional): Update Open Graph image URL/path stored as `ogImage` in frontmatter; can be `null`
- `featured_image` (optional): Backward-compatible alias for `ogImage`; `ogImage` takes precedence when it is provided, including `null`; can be `null`
- `canonicalURL` (optional): Update canonical URL; can be `null`
- `hideEditPost` (optional): Update whether the edit link is hidden
- `timezone` (optional): Update IANA timezone override
- `content` (optional): Update post content in Markdown

**Content image references:** PATCH `content` may include normal external images. Repo-backed blog visuals must be referenced as `/assets/blog/<slug>/filename.svg` or `/assets/blog/<slug>/filename.png`, include alt text plus a caption/title in Markdown, and have an existing backing file under `public/assets/blog/<slug>/`. Inline `data:image` URIs are invalid.

**Social preview behavior:** PATCH follows the same `ogImage` / `featured_image` precedence as create: `ogImage` is stored in frontmatter when supplied, `featured_image` is only a backward-compatible alias, and `ogImage` wins when both are supplied. Stored `ogImage` values may be absolute URLs, site-relative paths, or relative paths; rendered post metadata normalizes site-relative and relative values to absolute URLs using `SITE.website` without mutating the stored frontmatter value. Updated post pages can be verified with `pnpm run check:social-preview -- http://localhost:4321/posts/<slug>/` after building or running preview.

**Public crawl signal behavior:** after a successful PATCH write, if the resulting post is not a draft, the API submits public crawl signals for the canonical post URL and site sitemap through IndexNow plus Google Search Console sitemap resubmission, then records DuckDuckGo coverage evidence. DuckDuckGo coverage is documented as covered by Bing/IndexNow when IndexNow succeeds, or as canonical sitemap plus DuckDuckBot access when relying on crawler discovery; this implementation does not use a direct DuckDuckGo URL submission endpoint. Draft updates do not trigger crawl signals. Google Search Console submission requires a server-side `GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN`; `GOOGLE_SEARCH_CONSOLE_SITE_URL` and `GOOGLE_SEARCH_CONSOLE_SITEMAP_URL` are optional overrides. If the token is missing, Google submission is skipped without failing the post write. Set `DUCKDUCKGO_CRAWL_SIGNAL_DISABLED=true` to opt out of the DuckDuckGo coverage evaluation.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Post updated successfully",
  "slug": "my-post-slug",
  "updated": {
    "featured": true,
    "draft": false
  }
}
```

## 6. Delete Post

Delete a blog post by slug.

```
DELETE /api/posts?slug=my-post-slug
```

**Headers:**
```
x-api-key: YOUR_API_KEY
```

**Query Parameters:**
- `slug` (required): The slug of the post to delete

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Post deleted successfully",
  "slug": "my-post-slug"
}
```

**Response (404 Not Found):**
```json
{
  "error": "Post not found",
  "slug": "my-post-slug"
}
```

---

## Authentication

All requests must include the `x-api-key` header with your API key:

```
x-api-key: YOUR_API_KEY
```

The API key should be stored in your environment variables as `X_API_KEY`.

## Test Connection

Test your API connection using curl:

```bash
# Validate API key
curl -X GET "https://berryhill.dev/api/auth/validate" \
  -H "x-api-key: YOUR_API_KEY"

# Health check
curl -X GET "https://berryhill.dev/api/health" \
  -H "x-api-key: YOUR_API_KEY"
```

## Error Responses

All endpoints may return these error responses:

**401 Unauthorized:**
```json
{
  "error": "API key required"
}
```
or
```json
{
  "error": "Invalid API key"
}
```

**400 Bad Request:**
```json
{
  "error": "Missing required parameter: [parameter_name]"
}
```

Endpoint-specific validation failures may also return:

```json
{
  "error": "Invalid blog visual asset reference",
  "details": [
    {
      "src": "/assets/blog/my-post-slug/diagram.svg",
      "reason": "Missing caption/title for local blog visual"
    }
  ]
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to perform operation",
  "details": "Error details..."
}
```
