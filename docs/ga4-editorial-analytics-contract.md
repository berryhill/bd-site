# GA4 Editorial Analytics Contract

## Purpose and ownership boundary

This contract defines how bd-site emits article-level GA4 pageview signals and how downstream consumers should join those signals to the live editorial inventory.

bd-site owns the measurement instrumentation, route/path normalization rules, and stable pageview parameters emitted from the shared layout when `PUBLIC_GA_MEASUREMENT_ID` is configured. Luca's external analytics pipeline and dashboard own GA4 refresh jobs, joined snapshot generation, dashboard presentation, and coverage/freshness warnings.

bd-site does not refresh GA4, configure GA4 custom dimensions automatically, update the Luca dashboard, or prove production inventory totals. Those are downstream responsibilities and must be validated outside this repo.

## Canonical inventory

The canonical editorial inventory is the authenticated live `/api/posts?draft=false` API/PVC public-post inventory.

The local Git Markdown checkout is never the canonical production inventory for analytics joins. Local Markdown may be useful for development fixtures or tests, but consumers must not treat it as proof of live post totals, live slugs, or production coverage.

## Article path normalization

The canonical article path is:

```text
/posts/<slug>/
```

Consumers and tests must normalize article URLs to that path shape before joining. Matching should reject non-article surfaces, including:

- `/posts/`
- paginated post-list routes
- archive routes
- API routes
- tag routes
- search routes
- `/archives/`
- feeds
- sitemap and robots routes
- Open Graph image routes
- Astro assets
- Pagefind assets

The `canonical_post_path` parameter and this path normalization are the required fallback join key. Custom dimensions are useful when available, but they are not the sole join dependency.

## Pageview emission

GA4 browser measurement is conditional on `PUBLIC_GA_MEASUREMENT_ID`. If that environment variable is unset, bd-site must not load GA4.

When GA4 is enabled, automatic config pageviews must stay disabled with `send_page_view=false`. The shared layout emits one guarded explicit `page_view` on `astro:page-load`, covering both the initial page load and Astro client navigation. The guard exists to prevent duplicate pageviews from the same load/navigation event.

## Pageview parameter contract

Every emitted pageview should include the standard page parameters:

- `page_location`
- `page_path`
- `page_title`

Article pageviews also include stable editorial parameters:

- `page_type`
- `post_slug`
- `canonical_post_path`
- `primary_tag`

For article routes, `page_type` identifies the page as article/post content, `post_slug` carries the stable post slug, `canonical_post_path` carries `/posts/<slug>/`, and `primary_tag` carries the selected primary editorial tag when available.

`page_type`, `post_slug`, `canonical_post_path`, and `primary_tag` are event-scoped custom-dimension candidates. bd-site emits them, but does not automatically configure them as GA4 custom dimensions. Consumers must continue to support the normalized `canonical_post_path` fallback join key instead of depending only on custom-dimension availability.

## Joined model contract

The downstream joined model should produce one row per live post from the canonical authenticated `/api/posts?draft=false` inventory.

GA4 measurement state must be labeled separately from editorial metadata state:

- `ga4_joined` means the live post joined to GA4 data in the selected reporting window.
- `no_data_in_window` means the live post exists but has no matching GA4 data in the selected reporting window.
- `editorial_joined` means the row has the expected live editorial metadata.
- `editorial_metadata_missing` means GA4 or intermediate analytics data references a post/path whose live editorial metadata was not present in the canonical inventory join.

Phantoms must be labeled separately. A phantom is an analytics or dashboard row for a slug/path that is no longer present in the canonical live inventory.

`generatedAt` is the snapshot serialization time. `ga4MeasuredAt` is the underlying GA4 measurement/export time. A fresh `generatedAt` does not prove fresh GA4 data and must not masquerade as a current `ga4MeasuredAt`.

## Consumer requirements

Consumers must read from one versioned joined snapshot for a given dashboard/report view instead of mixing rows from multiple generations.

Consumers must separately expose:

- honest live coverage against the canonical `/api/posts?draft=false` inventory
- GA4 freshness based on `ga4MeasuredAt`
- phantom count

A current `generatedAt` may show that the snapshot was recently serialized, but it must not be presented as current GA4 measurement freshness. Coverage, GA4 freshness, and phantom status are separate health signals.

## Validation

Validation is covered by `tests/ga4EditorialMapping.test.mjs` and the repository test command:

```bash
pnpm test
```

The validation suite should cover normalization, live-only posts, phantoms, route exclusion, explicit pageview count, and post-layout editorial parameters. Route exclusion should include the non-article surfaces listed in this contract, and pageview validation should confirm `send_page_view=false` plus one guarded explicit `page_view` on `astro:page-load` for eligible loads/navigation.
