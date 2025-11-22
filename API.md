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

## 1. Health Check

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
  "error": "API key required"
}
```
or
```json
{
  "error": "Invalid API key"
}
```

## 2. Get Posts

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

## 3. Create Post

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
  "draft": true
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Post created successfully",
  "slug": "my-new-post",
  "filename": "my-new-post.md"
}
```

## 4. Update Post

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
  "content": "# Updated Content\n\nNew post content..."
}
```

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

## 5. Delete Post

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

The API key should be stored in your environment variables as `BLOG_API_KEY`.

## Test Connection

Test your API connection using curl:

```bash
curl -X GET "https://interstellardispatch.com/api/health" \
  -H "x-api-key: YOUR_API_KEY"
```

Expected response: `{"status":"healthy","message":"API is operational"}`

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
