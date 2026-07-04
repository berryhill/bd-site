# LLM Crawl Manifest

## Domain Information
- **Domain**: berryhill.dev
- **Protocol**: HTTPS
- **Site Type**: Personal blog (Astro-based)

## Sitemap Configuration
- **Sitemap URL**: https://berryhill.dev/sitemap.xml
- **Sitemap Type**: Custom dynamic sitemap (SSR)
- **Sitemaps**:
  - `/sitemap.xml` - Canonical crawler-facing master index. Robots.txt, layout metadata, `/llms.txt`, and verification checks advertise this URL directly.
  - `/sitemap-static.xml` - Real static content pages only (`/`, `/about/`, `/posts/`, `/tags/`, `/search/`, and `/archives/` when enabled); redirect-only endpoints such as `/sitemap-index.xml` are excluded.
  - `/sitemap-posts.xml` - Public blog posts only, excluding drafts, underscore/private paths, invalid or missing publish dates, and posts scheduled outside the configured margin.
  - `/sitemap-index.xml` - Backward-compatibility redirect only; not an advertised sitemap surface.
- **URL normalization**: Static page `<loc>` values in `/sitemap-static.xml` and post `<loc>` values in `/sitemap-posts.xml` are normalized through the shared URL helper using `SITE.website`.
- **Update Frequency**: Real-time (generated on-demand)
- **Submission Status**:
  - Google Search Console: Pending
  - Bing Webmaster Tools: Pending
- **IndexNow**: ✅ **IMPLEMENTED**
  - API Key: Hosted at `/a63643bb50ffbee1ac79fcfe60003c1dc912bdee3803a9308fa313f06024d2c6.txt`
  - Auto-submits to Bing, Yandex, Naver, Seznam, Yep on post create/update
  - Supports bulk submission (up to 10,000 URLs)

### ✅ **FIXED: Blog Posts Now in Sitemap!**
Previously, only 6 static pages were included. Now public blog posts that pass the shared filter are discoverable by search engines and LLM crawlers, excluding drafts, underscore/private paths, invalid or missing publish dates, and posts scheduled outside the configured margin.

## Robots.txt Permissions
- **Location**: https://berryhill.dev/robots.txt
- **Status**: ✅ **FULLY LLM-OPTIMIZED**

### Explicitly Allowed Crawlers (18+ AI bots):

**OpenAI:**
- ✅ GPTBot (model training for GPT-4o/GPT-5)
- ✅ OAI-SearchBot (ChatGPT search citations)
- ✅ ChatGPT-User (user-driven browsing)

**Anthropic (Claude):**
- ✅ ClaudeBot (chat citation fetch)
- ✅ anthropic-ai (bulk model training)
- ✅ claude-web (web-focused crawl)
- ✅ Claude-User (user-driven)

**Google AI:**
- ✅ Google-Extended (Gemini training)
- ✅ GoogleOther (AI products)

**Perplexity:**
- ✅ PerplexityBot

**Common Crawl:**
- ✅ CCBot (dataset for AI training)

**Meta AI:**
- ✅ Meta-ExternalAgent
- ✅ Meta-ExternalFetcher
- ✅ FacebookBot

**Apple AI:**
- ✅ Applebot-Extended (Apple Intelligence)

**Amazon AI:**
- ✅ Amazonbot

**ByteDance/TikTok:**
- ✅ Bytespider

**Other AI/ML Crawlers:**
- ✅ cohere-ai (Cohere)
- ✅ YouBot (You.com search)
- ✅ Diffbot
- ✅ ImagesiftBot
- ✅ Omgili/Omgilibot

**General:**
- ✅ * (All other crawlers allowed by default)

### Generated asset/index policy
- All crawler groups allow `/` and explicitly allow `/llms.txt`.
- All crawler groups disallow crawl-noisy generated/static asset paths: `/pagefind/`, `/_astro/`, `/assets/`, CSS, JS, source maps, JSON files, images, SVGs, WebP files, and icons.
- `Sitemap:` points to `https://berryhill.dev/sitemap.xml`.

## Structured Data

### Current Implementation (Phase 3 — PR #43):
All structured data uses [Schema.org](https://schema.org) JSON-LD. The global `BlogPosting` baseline has been replaced with page-specific schema types. Values are stripped of `undefined`/`null` at build time.

#### Page-specific schemas

| Page | Schema Type | Key Fields |
|---|---|---|
| Homepage | `WebSite` | name, url, description, image, author (Person) |
| About | `Person` | name, url, image, description |
| Posts list, Tags, Archives | `CollectionPage` | name, description, url, isPartOf (WebSite) |
| Post detail | `BlogPosting` | headline, description, url, mainEntityOfPage (WebPage), image, keywords (tags), datePublished, dateModified, author (Person array), publisher (Person) |

#### BlogPosting enriched fields (post detail pages)
- `headline` — post title
- `description` — post description frontmatter field
- `url` — canonical post URL normalized through the shared URL helper using `SITE.website`
- `mainEntityOfPage` — WebPage referencing the post URL
- `image` — OG image URL normalized through the shared URL helper using `SITE.website` (if present)
- `keywords` — post tags as array
- `datePublished` — ISO 8601 publication datetime
- `dateModified` — ISO 8601 last-modified datetime (omitted if absent)
- `author` — Person array with name and profile URL
- `publisher` — Person with name and profile URL

#### Implementation notes
- Utility: `src/utils/structuredData.ts` — typed builders for each schema type
- Layout wiring: `Layout.astro` accepts optional `jsonLd` prop, renders only when provided
- Tests: `tests/structuredData.test.mjs` — validates schema types, required fields, and absence of undefined values

### Planned Additions:
- FAQPage schema (if FAQ content is added)
- Product schema (if relevant)

## Content Features
- **RSS Feed**: https://berryhill.dev/rss.xml ✅ **FULLY OPTIMIZED**
  - Full content delivery (not just descriptions)
  - Author information (RFC 822 format)
  - Categories/tags for classification
  - Permanent GUIDs for each post
  - atom:link self-reference
  - Language and editorial metadata
  - lastBuildDate for freshness indication
  - Uses shared `getSortedPosts`/`getPublicPosts` filtering with Atom, `/llms.txt`, and `/sitemap-posts.xml` so machine-readable surfaces expose the same public corpus.
  - Optimal for LLM/aggregator consumption
- **Atom Feed**: https://berryhill.dev/atom.xml ✅ **IMPLEMENTED** (PR #41, 2026-06-21)
  - Valid Atom 1.0 format with `<entry>` elements
  - Includes `<id>`, `<updated>`, `<published>`, `<summary>`, `<link>`, and `<category>` tags per entry
  - Same shared public post data as RSS feed, `/llms.txt`, and `/sitemap-posts.xml` through `getSortedPosts`/`getPublicPosts`.
- **Feed Alias**: https://berryhill.dev/feed.xml → 301 redirect to `/rss.xml` ✅ (PR #41)
  - Common feed reader convention; stable redirect
- **Feed Autodiscovery**: ✅ **IMPLEMENTED** (PR #41)
  - `<link rel="alternate" type="application/rss+xml">` in site layout
  - `<link rel="alternate" type="application/atom+xml">` in site layout
  - All pages advertise both RSS and Atom feeds for feed readers and LLM crawlers
- **Open Graph**: ✅ Configured with dark theme
- **Twitter Cards**: ✅ summary_large_image
- **Canonical URLs**: ✅ Set on all pages; post canonical URLs are normalized through the shared URL helper
- **Post URL normalization**: ✅ Post canonical, OG image, and JSON-LD URL fields share the same `SITE.website` normalization path
- **Meta Descriptions**: ✅ Unique per page

## LLM Optimization Status (Phase 1)

### ✅ Completed:
1. robots.txt explicitly allows all major LLM crawlers (18+ bots)
2. Sitemap generated and accessible
3. Structured data baseline (BlogPosting schema on all posts)
4. llms.txt manifest endpoint at `/llms.txt` (2026-06-21, PR #35)
5. Issue #58 crawl-signal reconciliation (2026-07-03): canonical `/sitemap.xml` signals in robots/layout/llms/check script, robots asset/index noise reduction, static sitemap redirect exclusion, and search visibility check alignment
6. Issue #59 public-post filtering reconciliation (2026-07-03): RSS, Atom, `/llms.txt`, and `/sitemap-posts.xml` share `getSortedPosts`/`getPublicPosts` so machine-readable surfaces expose the same public corpus.

### ⚠️ Production Deployment Note (2026-06-21)

The `src/pages/llms.txt.ts` implementation merged in PR #35 is correct and builds successfully. However, because the running pod's image tag is pinned to `0.0.42` in `helm/values.yaml` and the Helm chart was not re-deployed after the merge, `/llms.txt` may return 404 until the next deployment picks up the post-#35 build.

To deploy SSR route changes (like `/llms.txt`):

1. The `helm/values.yaml` image tag must be bumped to match the Docker build tag
   (`DOCKER_TAG` in `.github/workflows/deploy.yaml`) and the Helm upgrade re-run.
2. Alternatively, switch to `:latest` tag with `image.pullPolicy: Always`.

**Verification after deployment:**
```bash
curl -si https://berryhill.dev/llms.txt | head -5
# Expected: HTTP/2 200 + Content-Type: text/plain
```

### 🔄 In Progress:
1. Verify `/llms.txt` is live in production after deployment
2. Submit sitemap to Google Search Console
3. Submit sitemap to Bing Webmaster Tools

### ✅ Phase 5 (2026-06-25, PR pending):
1. ✅ Added `scripts/checkSearchVisibility.mjs` verification harness
2. ✅ Added `pnpm run check:search-visibility` package script
3. ✅ Documented Pagefind SSR limitation
4. ✅ Updated `LLM_CRAWL_MANIFEST.md` with verification section

### 📋 Planned:
1. Add FAQPage schema if FAQ content is created
2. Monitor crawler activity in server logs
3. Submit sitemap to Google Search Console
4. Submit sitemap to Bing Webmaster Tools

## Verification Script

A repeatable verification harness verifies all crawl surfaces in one command:

```bash
pnpm run check:search-visibility
# Optional: point at a different base URL
pnpm run check:search-visibility -- https://staging.berryhill.dev
```

Checks performed:
| Check | Path | Assertion |
|-------|------|-----------|
| robots.txt | /robots.txt | Sitemap: directive or allow/disallow rules |
| sitemap | /sitemap.xml | sitemap XML structure and shared public corpus coverage |
| rss.xml | /rss.xml | RSS 2.0 channel element and shared public corpus coverage |
| atom.xml | /atom.xml | Atom 1.0 feed with `<feed>` root and shared public corpus coverage |
| feed.xml | /feed.xml | HTTP 301 redirect to /rss.xml |
| autodiscovery | / | `<link rel="alternate">` tags for rss+xml and atom+xml |
| llms.txt | /llms.txt | title + sitemap + RSS references and shared public corpus alignment (requires PR #35 deployed) |
| post JSON-LD | /posts/{slug}/ | JSON-LD structured data (optional) |

URL readback should confirm that `/sitemap-static.xml` and `/sitemap-posts.xml` emit absolute `<loc>` values using `SITE.website`, that sitemap/feed/llms checks validate the shared public corpus rather than XML shape alone, and that post detail pages emit canonical, Open Graph, and JSON-LD URLs through the shared URL helper.

Pagefind note: `/search` remains a real crawlable page. Generated `/pagefind/` index assets are intentionally disallowed in robots.txt as crawl noise. `pnpm run build` currently maps to `astro build`, and CI does not generate Pagefind index assets unless package scripts or CI are explicitly changed. Verify Pagefind index presence only in environments that actually generate `public/pagefind/`.

## Notes
- As of 2025, GPTBot accounts for ~30% of AI crawler traffic
- Perplexity and Anthropic have been known to bypass robots.txt - explicit Allow directives help
- All major AI companies (OpenAI, Anthropic, Google, Meta, Apple, Amazon) are explicitly welcomed

## Changelog

### 2026-07-03
- ✅ **Public Post Filtering Reconciliation** (Issue #59): RSS, Atom, `/llms.txt`, and `/sitemap-posts.xml` now share public-post filtering for drafts, underscore/private paths, invalid or missing publish dates, and posts scheduled outside the configured margin.
- ✅ **Static Sitemap, Robots, and Search Indexing Signals** (Issue #58): Canonical `/sitemap.xml` signals now flow through robots.txt, layout metadata, `/llms.txt`, and `check:search-visibility`; `/sitemap-static.xml` excludes redirect-only paths such as `/sitemap-index.xml`; robots.txt keeps the AI crawler allowlist while disallowing generated asset/index noise; shared `crawlSignals` and `staticSitemap` utilities and tests cover the policy.
- ✅ **URL Normalization Reconciliation** (Issue #57): Documented shared URL-helper normalization for static/post sitemap `<loc>` values and post canonical, Open Graph, and JSON-LD URLs. The sitemap index still uses the existing route behavior and is not claimed as normalized here.

### 2026-06-21
- ✅ **Atom Feed + Feed Aliases** (PR #41): Added `/atom.xml` (valid Atom 1.0), `/feed.xml` (301 → `/rss.xml`), and `<link rel="alternate">` autodiscovery tags for both RSS and Atom in the site layout. Updates LLM_CRAWL_MANIFEST.md.

### 2025-10-29
- ✅ **RSS Feed Optimization**: Enhanced for LLM/aggregator consumption
  - Added full content delivery (markdown/MDX body)
  - Included author metadata in RFC 822 format
  - Added categories/tags for AI classification
  - Implemented permanent GUIDs for deduplication
  - Added atom:link self-reference (RSS 2.0 best practice)
  - Included language, lastBuildDate, and editorial metadata
  - Optimized for crawlers like Perplexity, ChatGPT, Claude
- ✅ **IndexNow Automation**: Implemented instant indexing for Bing, Yandex, and more
  - Auto-pings IndexNow API when posts are created or updated
  - Generated and hosted API key
  - Integrated with POST and PATCH endpoints
  - Skips draft posts automatically

### 2025-10-28
- ✅ **CRITICAL FIX**: Fixed sitemap to include all blog posts
  - Migrated from @astrojs/sitemap integration to custom dynamic sitemaps
  - Created 3-part sitemap system (index, static, posts)
  - All blog posts now discoverable by search engines and LLM crawlers
- ✅ Made robots.txt fully LLM-optimized with 18+ AI crawler allowlist
- ✅ Created LLM Crawl Manifest documentation

## Last Updated
2026-07-03
