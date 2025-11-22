# API Endpoints

Use these endpoints to integrate with DraftFly or other platforms.

## Base URL

```
https://interstellardispatch.com
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
- `tag` (optional): Filter by tag

**Response (200 OK):**
```json
{
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
  "tags": ["blog", "astro"],
  "featured": false,
  "draft": true,
  "featured_image": "https://example.com/image.jpg"
}
```

**Fields:**
- `title` (required): Post title
- `description` (required): Post description
- `content` (required): Post content in Markdown
- `tags` (optional): Array of tags (defaults to ["blog"])
- `featured` (optional): Featured status (defaults to false)
- `draft` (optional): Draft status (defaults to false)
- `featured_image` (optional): URL to featured image (stored as ogImage in frontmatter)

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
PATCH /api/posts?slug=my-post-slug
```

**Headers:**
```
x-api-key: YOUR_API_KEY
Content-Type: application/json
```

**Query Parameters:**
- `slug` (required): The slug of the post to update

**Request Body (all fields optional):**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "featured": true,
  "draft": false,
  "tags": ["updated", "tags"],
  "featured_image": "https://example.com/new-image.jpg",
  "content": "# Updated Content\n\nNew post content..."
}
```

**Fields:**
- `title` (optional): Update post title
- `description` (optional): Update post description
- `featured` (optional): Update featured status
- `draft` (optional): Update draft status
- `tags` (optional): Update tags array
- `featured_image` (optional): Update featured image URL (stored as ogImage in frontmatter)
- `content` (optional): Update post content in Markdown

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Post updated successfully",
  "slug": "my-post-slug",
  "updated": {
    "title": true,
    "description": true,
    "featured": true,
    "draft": true,
    "tags": true,
    "content": true
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

**500 Internal Server Error:**
```json
{
  "error": "Failed to perform operation",
  "details": "Error details..."
}
```
