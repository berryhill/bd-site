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

**Title quality behavior:** non-draft creates validate the rendered title tag before writing. The rendered title is the post title plus the site suffix (` | berryhill.dev`), with a default maximum length of 65 characters. The same gate checks for near-duplicate similarity against recent public posts. Draft creates bypass this gate until they are made non-draft.

**Content image references:** POST `content` may include normal external images. Repo-backed blog visuals must be referenced as `/assets/blog/<slug>/filename.svg` or `/assets/blog/<slug>/filename.png`, include alt text plus a caption/title in Markdown, and have an existing backing file under `public/assets/blog/<slug>/`. Inline `data:image` URIs are invalid.

**Social preview behavior:** `ogImage` is written to frontmatter and becomes the rendered post's `og:image`, `twitter:image`, and JSON-LD image. Stored `ogImage` values may be absolute URLs, site-relative paths, or relative paths; rendered post metadata normalizes site-relative and relative values to absolute URLs using `SITE.website` without mutating the stored frontmatter value. `featured_image` is only a backward-compatible alias; `ogImage` wins when both are supplied. If no `ogImage` is stored and the post is not a draft, the site falls back to the dynamic `/posts/<slug>/index.png` image route when `SITE.dynamicOgImage` is enabled. For a non-draft create, the API waits for social preview readiness before returning success: it fetches the public post URL and the advertised social image as `Twitterbot/1.0` for up to 5 attempts, 500 ms apart. Readiness requires complete social metadata, matching absolute `og:image` and `twitter:image` URLs, `twitter:card` set to `summary_large_image`, and a reachable `image/png` response whose PNG header reports 1200×630 dimensions. This confirms the post-specific social preview endpoint is returning a valid PNG at response time; it does not guarantee X/Twitter card rendering, cache invalidation, recrawl, or indexing.

**Public crawl signal behavior:** after a successful non-draft POST write, the API submits public crawl signals for the canonical post URL and site sitemap only when `socialPreviewReadiness.ready` is true. The response includes `shareReady` and `socialPreviewReadiness` for non-draft writes; `crawlSignals` appears only when readiness passes. `socialPreviewReadiness` contains `ready`, `postUrl`, `attempts`, optional `metadata`, optional `imageUrl`, optional `imageBytes`, optional `imageDimensions`, and `issues` with `stage`, optional `field`, `url`, and `reason`. `crawlSignals` evidence includes `indexNow`, `google`, `duckDuckGo`, and `yahoo` fields: IndexNow submits the post URL, Google Search Console performs supported sitemap resubmission, DuckDuckGo coverage is documented as covered by Bing/IndexNow when IndexNow succeeds or as canonical sitemap plus DuckDuckBot access when relying on crawler discovery, and Yahoo evidence records crawl discovery through Bing IndexNow / Yahoo Slurp plus sitemap and robots access. Neither DuckDuckGo nor Yahoo is treated as a standalone direct URL submission endpoint, and these signals do not guarantee indexing. Draft posts skip social preview readiness and crawl signals. Google Search Console submission requires a server-side `GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN`; `GOOGLE_SEARCH_CONSOLE_SITE_URL` and `GOOGLE_SEARCH_CONSOLE_SITEMAP_URL` are optional overrides. If the token is missing, Google submission is skipped without failing the post write. Set `DUCKDUCKGO_CRAWL_SIGNAL_DISABLED=true` to opt out of the DuckDuckGo coverage evaluation.

**Social preview verification:** after building or running preview, check a post page with:

```bash
pnpm run check:social-preview -- http://localhost:4321/posts/<slug>/
```

With a URL input, the command verifies `<title>`, meta description, Open Graph title/description/image, Twitter card/title/description/image readback, `og:type`, `og:site_name`, matching Open Graph/Twitter URLs, image/png content type, 1200x630 image dimensions, matching Open Graph/Twitter image alt text, and standards-correct Twitter `name` attributes. It then fetches the advertised image endpoint as Twitterbot, follows redirects, and rejects unreachable or non-image responses. Local HTML-file inputs are metadata-only and cannot validate advertised image reachability or content type.

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Post created successfully",
  "slug": "my-new-post",
  "filename": "my-new-post.md",
  "shareReady": true,
  "socialPreviewReadiness": {
    "ready": true,
    "postUrl": "https://berryhill.dev/posts/my-new-post/",
    "attempts": 1,
    "metadata": {
      "title": "My New Post | berryhill.dev",
      "description": "A description of my post",
      "ogType": "article",
      "ogSiteName": "berryhill.dev",
      "ogTitle": "My New Post | berryhill.dev",
      "ogDescription": "A description of my post",
      "ogUrl": "https://berryhill.dev/posts/my-new-post/",
      "ogImage": "https://berryhill.dev/posts/my-new-post/index.png",
      "ogImageType": "image/png",
      "ogImageWidth": "1200",
      "ogImageHeight": "630",
      "ogImageAlt": "My New Post | berryhill.dev — berryhill.dev",
      "twitterCard": "summary_large_image",
      "twitterUrl": "https://berryhill.dev/posts/my-new-post/",
      "twitterTitle": "My New Post | berryhill.dev",
      "twitterDescription": "A description of my post",
      "twitterImage": "https://berryhill.dev/posts/my-new-post/index.png",
      "twitterImageAlt": "My New Post | berryhill.dev — berryhill.dev"
    },
    "imageUrl": "https://berryhill.dev/posts/my-new-post/index.png",
    "imageBytes": 123456,
    "imageDimensions": {
      "width": 1200,
      "height": 630
    },
    "issues": []
  },
  "crawlSignals": {
    "ok": true,
    "indexNow": true,
    "google": {
      "ok": true,
      "skipped": false
    },
    "yahoo": {
      "ok": true,
      "route": "bing_indexnow_yahoo_crawl_discovery",
      "searchEngine": "yahoo",
      "via": "bing_webmaster_tools_indexnow",
      "crawler": "Yahoo Slurp",
      "endpoint": "https://www.bing.com/indexnow",
      "robotsTxt": "/robots.txt",
      "guaranteedIndexing": false,
      "indexNowSubmitted": true
    }
  }
}
```

`shareReady` and `socialPreviewReadiness` appear only for non-draft writes. `crawlSignals` appears only for non-draft writes after `socialPreviewReadiness.ready` is true. The `yahoo` object is honest discovery evidence through Bing IndexNow / Yahoo Slurp and sitemap/robots visibility; it is not proof of guaranteed Yahoo indexing.

**Response (400 Bad Request — title quality):**
```json
{
  "error": "Invalid post title quality",
  "details": [
    {
      "code": "rendered_title_too_long",
      "message": "Rendered title exceeds the maximum length"
    },
    {
      "code": "near_duplicate_title",
      "message": "Title is too similar to a recent public post"
    }
  ],
  "titleQuality": {
    "renderedTitle": "My New Post | berryhill.dev",
    "renderedTitleLength": 28,
    "maxRenderedTitleLength": 65
  }
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

**Title quality behavior:** PATCH validates the resulting title/frontmatter before the file is rewritten when the resulting post is non-draft. The rendered title is the post title plus the site suffix (` | berryhill.dev`), with a default maximum length of 65 characters. Near-duplicate comparison is against recent public posts and excludes the current slug. Draft results bypass this gate.

**Content image references:** PATCH `content` may include normal external images. Repo-backed blog visuals must be referenced as `/assets/blog/<slug>/filename.svg` or `/assets/blog/<slug>/filename.png`, include alt text plus a caption/title in Markdown, and have an existing backing file under `public/assets/blog/<slug>/`. Inline `data:image` URIs are invalid.

**Social preview behavior:** PATCH follows the same `ogImage` / `featured_image` precedence as create: `ogImage` is stored in frontmatter when supplied, `featured_image` is only a backward-compatible alias, and `ogImage` wins when both are supplied. Stored `ogImage` values may be absolute URLs, site-relative paths, or relative paths; rendered post metadata normalizes site-relative and relative values to absolute URLs using `SITE.website` without mutating the stored frontmatter value. For a non-draft result, the API waits for social preview readiness before returning success: it fetches the public post URL and the advertised social image as `Twitterbot/1.0` for up to 5 attempts, 500 ms apart. Readiness requires complete social metadata, matching absolute `og:image` and `twitter:image` URLs, `twitter:card` set to `summary_large_image`, and a reachable `image/png` response whose PNG header reports 1200×630 dimensions. This confirms the post-specific social preview endpoint is returning a valid PNG at response time; it does not guarantee X/Twitter card rendering, cache invalidation, recrawl, or indexing. Updated post pages can still be verified manually with `pnpm run check:social-preview -- http://localhost:4321/posts/<slug>/` after building or running preview; URL checks validate metadata plus the advertised image endpoint as Twitterbot, while local HTML-file checks are metadata-only and cannot validate image reachability. Verification requires `og:type`, `og:site_name`, matching Open Graph/Twitter URLs, image/png content type, 1200x630 dimensions, matching image alt text across Open Graph/Twitter, and standards-correct Twitter `name` attributes.

**Public crawl signal behavior:** after a successful PATCH write, if the resulting post is not a draft, the API submits public crawl signals for the canonical post URL and site sitemap only when `socialPreviewReadiness.ready` is true. The response includes `shareReady` and `socialPreviewReadiness` for non-draft results; `crawlSignals` appears only when readiness passes. `socialPreviewReadiness` contains `ready`, `postUrl`, `attempts`, optional `metadata`, optional `imageUrl`, optional `imageBytes`, optional `imageDimensions`, and `issues` with `stage`, optional `field`, `url`, and `reason`. `crawlSignals` evidence includes `indexNow`, `google`, `duckDuckGo`, and `yahoo` fields: IndexNow submits the post URL, Google Search Console performs supported sitemap resubmission, DuckDuckGo coverage is documented as covered by Bing/IndexNow when IndexNow succeeds or as canonical sitemap plus DuckDuckBot access when relying on crawler discovery, and Yahoo evidence records crawl discovery through Bing IndexNow / Yahoo Slurp plus sitemap and robots access. Neither DuckDuckGo nor Yahoo is treated as a standalone direct URL submission endpoint, and these signals do not guarantee indexing. Draft updates skip social preview readiness and crawl signals. Google Search Console submission requires a server-side `GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN`; `GOOGLE_SEARCH_CONSOLE_SITE_URL` and `GOOGLE_SEARCH_CONSOLE_SITEMAP_URL` are optional overrides. If the token is missing, Google submission is skipped without failing the post write. Set `DUCKDUCKGO_CRAWL_SIGNAL_DISABLED=true` to opt out of the DuckDuckGo coverage evaluation.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Post updated successfully",
  "slug": "my-post-slug",
  "updated": {
    "featured": true,
    "draft": false
  },
  "shareReady": true,
  "socialPreviewReadiness": {
    "ready": true,
    "postUrl": "https://berryhill.dev/posts/my-post-slug/",
    "attempts": 1,
    "metadata": {
      "title": "Updated Title | berryhill.dev",
      "description": "Updated description",
      "ogType": "article",
      "ogSiteName": "berryhill.dev",
      "ogTitle": "Updated Title | berryhill.dev",
      "ogDescription": "Updated description",
      "ogUrl": "https://berryhill.dev/posts/my-post-slug/",
      "ogImage": "https://berryhill.dev/posts/my-post-slug/index.png",
      "ogImageType": "image/png",
      "ogImageWidth": "1200",
      "ogImageHeight": "630",
      "ogImageAlt": "Updated Title | berryhill.dev — berryhill.dev",
      "twitterCard": "summary_large_image",
      "twitterUrl": "https://berryhill.dev/posts/my-post-slug/",
      "twitterTitle": "Updated Title | berryhill.dev",
      "twitterDescription": "Updated description",
      "twitterImage": "https://berryhill.dev/posts/my-post-slug/index.png",
      "twitterImageAlt": "Updated Title | berryhill.dev — berryhill.dev"
    },
    "imageUrl": "https://berryhill.dev/posts/my-post-slug/index.png",
    "imageBytes": 123456,
    "imageDimensions": {
      "width": 1200,
      "height": 630
    },
    "issues": []
  },
  "crawlSignals": {
    "ok": true,
    "indexNow": true,
    "google": {
      "ok": true,
      "skipped": false
    },
    "yahoo": {
      "ok": true,
      "route": "bing_indexnow_yahoo_crawl_discovery",
      "searchEngine": "yahoo",
      "via": "bing_webmaster_tools_indexnow",
      "crawler": "Yahoo Slurp",
      "endpoint": "https://www.bing.com/indexnow",
      "robotsTxt": "/robots.txt",
      "guaranteedIndexing": false,
      "indexNowSubmitted": true
    }
  }
}
```

`shareReady` and `socialPreviewReadiness` appear only when the resulting post is non-draft. `crawlSignals` appears only when the resulting post is non-draft and `socialPreviewReadiness.ready` is true. The `yahoo` object is honest discovery evidence through Bing IndexNow / Yahoo Slurp and sitemap/robots visibility; it is not proof of guaranteed Yahoo indexing.

**Response (400 Bad Request — title quality):**
```json
{
  "error": "Invalid post title quality",
  "details": [
    {
      "code": "rendered_title_too_long",
      "message": "Rendered title exceeds the maximum length"
    },
    {
      "code": "near_duplicate_title",
      "message": "Title is too similar to a recent public post"
    }
  ],
  "titleQuality": {
    "renderedTitle": "Updated Title | berryhill.dev",
    "renderedTitleLength": 29,
    "maxRenderedTitleLength": 65
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

or:

```json
{
  "error": "Invalid post title quality",
  "details": [
    {
      "code": "rendered_title_too_long",
      "message": "Rendered title exceeds the maximum length"
    }
  ],
  "titleQuality": {
    "renderedTitle": "A title that is too long once the site suffix is appended | berryhill.dev",
    "renderedTitleLength": 74,
    "maxRenderedTitleLength": 65
  }
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to perform operation",
  "details": "Error details..."
}
```
