# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AstroPaper site - a minimal, responsive, and SEO-friendly Astro blog theme based on the [satnaing/astro-paper](https://github.com/satnaing/astro-paper) template. The project uses Astro 5.x with TypeScript, TailwindCSS 4.x, and includes features like fuzzy search (via Pagefind), dynamic OG image generation, RSS feeds, and sitemap generation.

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development server (runs on localhost:4321)
pnpm run dev

# Build for production (package.json maps this to astro build)
pnpm run build

# Preview production build
pnpm run preview

# Type checking and sync
pnpm run sync        # Generate TypeScript types for Astro modules

# Code quality
pnpm test           # Run scoped unit tests
pnpm run lint        # Run ESLint
pnpm run format      # Format code with Prettier
pnpm run format:check # Check formatting without writing
```

## Architecture

### Content Management

- **Blog Posts**: All blog posts are stored as Markdown files in `src/data/blog/`
- **Content Schema**: Defined in [src/content.config.ts](src/content.config.ts) using Astro's content collections API
- **Post Filtering**: Posts with `draft: true` are hidden in production. Posts can be scheduled with `pubDatetime` and will appear after the scheduled time (with a 15-minute margin defined in `SITE.scheduledPostMargin`)
- **Frontmatter**: Posts use YAML frontmatter with fields like `title`, `description`, `pubDatetime`, `modDatetime`, `tags`, `featured`, `draft`, `ogImage`, `canonicalURL`, `hideEditPost`, `timezone`
- **Durable Blog Visuals**: Store repo-backed diagrams/assets under `public/assets/blog/<post-slug>/` and reference them from Markdown as `/assets/blog/<post-slug>/filename.svg` or `.png` with alt text and a caption/title. Inline `data:image` URIs are rejected.

### Routing Structure

- `/` - Homepage showing recent posts (paginated)
- `/posts/[page]` - Paginated list of all posts
- `/posts/[slug]/` - Individual post pages
- `/tags/` - Tag index page
- `/tags/[tag]/[page]` - Posts filtered by tag (paginated)
- `/archives/` - Archive view (controlled by `SITE.showArchives`)
- `/search` - Client-side search powered by Pagefind; generated Pagefind index assets under `/pagefind/` are not a crawler target and are disallowed in robots.txt as generated search-index noise
- `/about` - About page (Markdown file at `src/pages/about.md`)

### Configuration

- **Site Config**: [src/config.ts](src/config.ts) exports the `SITE` object containing:
  - Site metadata (title, description, author, URL)
  - Feature toggles (light/dark mode, archives, back button, edit post)
  - Pagination settings (`postPerIndex`, `postPerPage`)
  - Timezone and language settings
  - Edit post URL configuration

- **Astro Config**: [astro.config.ts](astro.config.ts) configures:
  - Sitemap integration
  - Markdown plugins (remark-toc, remark-collapse)
  - Syntax highlighting with Shiki (light: "min-light", dark: "night-owl")
  - Custom Shiki transformers for filename display, diff highlighting, and word highlighting
  - TailwindCSS via Vite plugin
  - Environment variables (e.g., `PUBLIC_GOOGLE_SITE_VERIFICATION`)

### Key Utilities

- **Post Filtering**: [src/utils/postFilter.ts](src/utils/postFilter.ts) - Filters drafts and scheduled posts
- **Post Sorting**: [src/utils/getSortedPosts.ts](src/utils/getSortedPosts.ts) - Sorts by `modDatetime` or `pubDatetime` (descending)
- **OG Image Generation**: [src/utils/generateOgImages.ts](src/utils/generateOgImages.ts) - Dynamic OG images using Satori and @resvg/resvg-js
  - Post OG images: `/posts/[slug]/index.png.ts`
  - Site OG image: `/og.png.ts`
- **URL Normalization**: [src/utils/url.ts](src/utils/url.ts) - Normalizes `SITE.website`, site-relative paths, post URLs, and post asset URLs to absolute URLs for post metadata and custom sitemap routes
- **Crawl Signals**: [src/utils/crawlSignals.ts](src/utils/crawlSignals.ts) - Shared source for canonical sitemap path, robots.txt crawler groups, generated asset disallow policy, and Layout sitemap href
- **Public Post Crawl Signals**: [src/utils/publicPostCrawlSignals.ts](src/utils/publicPostCrawlSignals.ts) - Coordinates IndexNow plus Google Search Console sitemap submission for public posts and returns Yahoo-specific discovery evidence via Bing IndexNow / Yahoo Slurp; Yahoo evidence is not a standalone Yahoo-owned submit endpoint and does not guarantee indexing
- **Google Search Console Submission**: [src/utils/googleSearchConsole.ts](src/utils/googleSearchConsole.ts) - Submits `/sitemap.xml` to Google Search Console using optional server-side environment configuration
- **Static Sitemap**: [src/utils/staticSitemap.ts](src/utils/staticSitemap.ts) - Shared source for static sitemap page selection and XML generation
- **Tag Management**: `getUniqueTags.ts`, `getPostsByTag.ts` for tag-based filtering
- **Slugification**: `slugify.ts` uses lodash.kebabcase for URL-friendly slugs

### Layouts

- **Layout.astro**: Base layout with HTML structure, SEO meta tags, and theme toggle
- **Main.astro**: Main content wrapper with header and footer
- **PostDetails.astro**: Individual post layout with breadcrumbs, datetime, tags, share links, and edit button
- **AboutLayout.astro**: Layout for the about page

### Path Aliasing

TypeScript path alias `@/*` maps to `./src/*` (configured in [tsconfig.json](tsconfig.json)). Use it for imports:
```typescript
import { SITE } from "@/config";
import getSortedPosts from "@/utils/getSortedPosts";
```

### Build Process

`pnpm run build` currently maps to `astro build` in `package.json`. The build does not generate Pagefind index assets unless package scripts or CI are explicitly changed.

### Search Functionality

Search is powered by Pagefind, which indexes the built site and provides client-side fuzzy search. The search UI is at `/search` and uses `@pagefind/default-ui`. `/search` is crawlable and discoverable; `/pagefind/` index assets are generated implementation files and intentionally not advertised for crawling.

### Styling

- TailwindCSS 4.x via Vite plugin
- `@tailwindcss/typography` for prose content styling
- Light/dark mode toggle (controlled via `public/toggle-theme.js`)
- Theme preference stored in localStorage

### Dynamic Features

- **Dynamic OG Images**: Automatically generated for posts if `SITE.dynamicOgImage` is true
- **RSS Feed**: Generated at `/rss.xml` using `@astrojs/rss`
- **Sitemap**: Custom SSR sitemap routes generate canonical crawler-facing `/sitemap.xml`, `/sitemap-static.xml` for real static pages only, and `/sitemap-posts.xml` for posts; `/sitemap-index.xml` redirects only for backward compatibility and should not be newly advertised
- **Robots.txt**: Dynamically generated at `/robots.txt.ts` from shared crawlSignals rules, including explicit crawler groups and generated asset/index disallows

## Important Notes

- The project uses pnpm as the package manager
- Blog posts with filenames starting with `_` are ignored by the glob loader pattern
- Durable local blog visuals must use normal Markdown image syntax with alt text and caption/title; do not inline `data:image` URIs.
- POST/PATCH `/api/posts` include `crawlSignals` responses only for non-draft posts after successful file writes. IndexNow submits the post URL immediately; Google Search Console sitemap submission is best-effort and skipped when credentials are missing; Yahoo-specific evidence is discovery via Bing IndexNow / Yahoo Slurp, not guaranteed Yahoo indexing.
- Posts are timezone-aware; global timezone is set in `SITE.timezone` (IANA format), individual posts can override with frontmatter `timezone`
- The edit post feature links to a GitHub repository URL (configurable in `SITE.editPost`)
- Archives page visibility is controlled by `SITE.showArchives` in the sitemap filter
