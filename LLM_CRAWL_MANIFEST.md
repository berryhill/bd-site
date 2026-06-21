# LLM Crawl Manifest

## Domain Information
- **Domain**: berryhill.dev
- **Protocol**: HTTPS
- **Site Type**: Personal blog (Astro-based)

## Sitemap Configuration
- **Sitemap URL**: https://berryhill.dev/sitemap.xml
- **Sitemap Type**: Custom dynamic sitemap (SSR)
- **Sitemaps**:
  - `/sitemap.xml` - Master index
  - `/sitemap-static.xml` - Static pages
  - `/sitemap-posts.xml` - All blog posts with lastmod dates
- **Update Frequency**: Real-time (generated on-demand)
- **Submission Status**:
  - Google Search Console: Pending
  - Bing Webmaster Tools: Pending
- **IndexNow**: ✅ **IMPLEMENTED**
  - API Key: Hosted at `/a63643bb50ffbee1ac79fcfe60003c1dc912bdee3803a9308fa313f06024d2c6.txt`
  - Auto-submits to Bing, Yandex, Naver, Seznam, Yep on post create/update
  - Supports bulk submission (up to 10,000 URLs)

### ✅ **FIXED: Blog Posts Now in Sitemap!**
Previously, only 6 static pages were included. Now ALL published blog posts are discoverable by search engines and LLM crawlers.

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

## Structured Data

### Current Implementation:
- **BlogPosting**: ✅ Implemented on all post pages
  - headline
  - image
  - datePublished
  - dateModified
  - author (Person schema)

### Planned Additions:
- FAQPage schema (if FAQ content is added)
- Product schema (if relevant)
- Article schema (enhanced version of BlogPosting)

## Content Features
- **RSS Feed**: https://berryhill.dev/rss.xml ✅ **FULLY OPTIMIZED**
  - Full content delivery (not just descriptions)
  - Author information (RFC 822 format)
  - Categories/tags for classification
  - Permanent GUIDs for each post
  - atom:link self-reference
  - Language and editorial metadata
  - lastBuildDate for freshness indication
  - Optimal for LLM/aggregator consumption
- **Atom Feed**: https://berryhill.dev/atom.xml ✅ **IMPLEMENTED** (PR #41, 2026-06-21)
  - Valid Atom 1.0 format with `<entry>` elements
  - Includes `<id>`, `<updated>`, `<published>`, `<summary>`, `<link>`, and `<category>` tags per entry
  - Same post data as RSS feed
- **Feed Alias**: https://berryhill.dev/feed.xml → 301 redirect to `/rss.xml` ✅ (PR #41)
  - Common feed reader convention; stable redirect
- **Feed Autodiscovery**: ✅ **IMPLEMENTED** (PR #41)
  - `<link rel="alternate" type="application/rss+xml">` in site layout
  - `<link rel="alternate" type="application/atom+xml">` in site layout
  - All pages advertise both RSS and Atom feeds for feed readers and LLM crawlers
- **Open Graph**: ✅ Configured with dark theme
- **Twitter Cards**: ✅ summary_large_image
- **Canonical URLs**: ✅ Set on all pages
- **Meta Descriptions**: ✅ Unique per page

## LLM Optimization Status (Phase 1)

### ✅ Completed:
1. robots.txt explicitly allows all major LLM crawlers (18+ bots)
2. Sitemap generated and accessible
3. Structured data baseline (BlogPosting schema on all posts)
4. llms.txt manifest endpoint at `/llms.txt` (2026-06-21, PR #35)

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
| sitemap-index | /sitemap-index.xml | sitemap XML structure |
| rss.xml | /rss.xml | RSS 2.0 channel element |
| atom.xml | /atom.xml | Atom 1.0 feed with `<feed>` root |
| feed.xml | /feed.xml | HTTP 301 redirect to /rss.xml |
| autodiscovery | / | `<link rel="alternate">` tags for rss+xml and atom+xml |
| llms.txt | /llms.txt | title + sitemap + RSS references (requires PR #35 deployed) |
| post JSON-LD | /posts/{slug}/ | JSON-LD structured data (optional) |

Pagefind note: requires static-site build output (`public/pagefind/`). With SSR/standalone-node mode, Pagefind indexing runs post-build in CI. Verify with `curl -s https://berryhill.dev/search | grep pagefind`.

## Notes
- As of 2025, GPTBot accounts for ~30% of AI crawler traffic
- Perplexity and Anthropic have been known to bypass robots.txt - explicit Allow directives help
- All major AI companies (OpenAI, Anthropic, Google, Meta, Apple, Amazon) are explicitly welcomed

## Changelog

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
2026-06-25
