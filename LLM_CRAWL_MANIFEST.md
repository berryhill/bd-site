# LLM Crawl Manifest

## Domain Information
- **Domain**: berryhill.dev
- **Protocol**: HTTPS
- **Site Type**: Personal blog (Astro-based)

## Sitemap Configuration
- **Sitemap URL**: https://berryhill.dev/sitemap-index.xml
- **Submission Status**:
  - Google Search Console: Pending
  - Bing Webmaster Tools: Pending
- **IndexNow**: Not yet implemented

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
- **RSS Feed**: https://berryhill.dev/rss.xml
- **Open Graph**: ✅ Configured with dark theme
- **Twitter Cards**: ✅ summary_large_image
- **Canonical URLs**: ✅ Set on all pages
- **Meta Descriptions**: ✅ Unique per page

## LLM Optimization Status (Phase 1)

### ✅ Completed:
1. robots.txt explicitly allows all major LLM crawlers (18+ bots)
2. Sitemap generated and accessible
3. Structured data baseline (BlogPosting schema on all posts)

### 🔄 In Progress:
1. Submit sitemap to Google Search Console
2. Submit sitemap to Bing Webmaster Tools

### 📋 Planned:
1. Implement IndexNow ping automation
2. Add FAQPage schema if FAQ content is created
3. Monitor crawler activity in server logs

## Notes
- As of 2025, GPTBot accounts for ~30% of AI crawler traffic
- Perplexity and Anthropic have been known to bypass robots.txt - explicit Allow directives help
- All major AI companies (OpenAI, Anthropic, Google, Meta, Apple, Amazon) are explicitly welcomed

## Last Updated
2025-10-28
