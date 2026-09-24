# Google discovery and Search Console operations

Repository changes repair technical discovery signals; they do not establish that
Google has crawled, rendered or indexed a page. Do not report “indexing fixed” from
a deployment, an HTTP 200, or an accepted sitemap PUT.

## What the application does

- Explicit `Googlebot` and `Googlebot-Image` robots groups allow public HTML,
  styles, scripts, article images, favicons and generated social cards. `/pagefind/`
  stays excluded. Wildcard/AI rules and Twitterbot's independent allowance remain.
- HTML navigation uses `toCanonicalHtmlPath(getPath(...))`; raw `getPath` still
  serves slug and asset consumers. Canonical metadata, feeds and child sitemaps
  keep their existing trailing-slash contract. Old links permanently redirect;
  page-one aliases consolidate to `/posts/`.
- The sitemap index omits optional child `lastmod` values: request time is not
  content modification time. Child-map post timestamps/inventory are unchanged.
- After a public post write and successful share-readiness gate, the API attempts
  a best-effort Search Console sitemap submission. It is not a general Indexing
  API call, and submission failure does not roll back the published post.

## Owner-controlled server authentication

Enable the Search Console API in the owning Google Cloud project. The authorized
Search Console property owner must grant the service account sufficient access to
submit sitemaps for **`sc-domain:berryhill.dev`** (normally Full user). Cloud IAM
roles alone do not grant Search Console property access. Verify this against the
owner's policy; no account or permission is provisioned by this repository.

Set server-only `GOOGLE_APPLICATION_CREDENTIALS` to an approved, protected mounted
service-account JSON file. Never place its contents in source, environment values,
Helm values, build arguments, screenshots, logs, issue comments or browser code.
The application delegates signing, token minting/expiry/refresh to
`google-auth-library`, scoped to `https://www.googleapis.com/auth/webmasters`.
Each submission creates a fresh client, so it obtains fresh credentials and
reloads a rotated projected file; it does not retain a static bearer token or
implement its own JWT signer. An explicit file path is required: without it, the
application does not search local ADC files or probe metadata servers.

Compatibility: an explicit `accessToken` function argument takes precedence;
otherwise a configured `GOOGLE_APPLICATION_CREDENTIALS` file takes precedence over
legacy `GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN`. Without a file, the legacy token still
works, but its external owner must refresh it. This prevents a stale runtime token
from silently shadowing an owner-enabled service-account mount. Remove unused static
tokens as an operational cleanup; do not infer that another tool's authenticated
Google session configures this app.

Optional server overrides:

- `GOOGLE_SEARCH_CONSOLE_SITE_URL`: exact property identifier; defaults to
  `sc-domain:berryhill.dev`. Explicit authorized URL-prefix properties remain
  supported, but are not interchangeable with the domain property.
- `GOOGLE_SEARCH_CONSOLE_SITEMAP_URL`: defaults to
  `https://berryhill.dev/sitemap.xml`.

The operation has a 10-second total deadline and bounds both Google authentication
and sitemap transports, with transport retries disabled. The server function's
`timeoutMs` option allows 1–60000 ms for controlled callers/tests. Fetch redirects
are rejected. No provider error messages, bodies, headers or request configs are
returned or logged.

## Optional Helm wiring (no Secret creation)

The chart defaults `googleSearchConsole.enabled` to false. The owner may opt in
using an existing, separately provisioned Secret in the deployment namespace:

```yaml
googleSearchConsole:
  enabled: true
  siteUrl: sc-domain:berryhill.dev
  sitemapUrl: https://berryhill.dev/sitemap.xml
  credentials:
    existingSecret: operator-managed-gsc
    key: credentials.json
```

`operator-managed-gsc` is an illustrative reference, not a provisioned resource.
The chart mounts only the selected key as a read-only directory at the generic
container path `/var/run/secrets/google-search-console/credentials.json`. No
`subPath` mount is used, so Kubernetes can project rotations. The application
must be allowed to read that file. The chart renders references only; do not
commit a Secret manifest or put key data in values. This works with either
filesystem or object content storage and does not alter existing content mounts.
The existing Doppler runtime can still supply compatible server environment
configuration; ensure it does not override the mounted path/property. When a
credential file is mounted, the server prefers it over any legacy static token;
remove unused token configuration when the owner is ready. Provisioning, permissions,
rotation and rollout belong to the authorized operator, not this patch.

## Result interpretation

| Result | Meaning |
| --- | --- |
| `skipped: true`, `missing_config: ...` | No configured authentication path; nothing submitted |
| `invalid_config` | Invalid URL/property/timeout input |
| `credential_error` | Credential client could not be loaded; inspect setup privately |
| `authentication_failed` (401) | Google rejected authentication |
| `authorization_failed` (403) | Google denied access (property/API permissions need owner review) |
| `transient_google_error` (429/5xx) | Rate limit or Google service failure; retry later |
| `google_request_rejected` | Other non-success Google response; investigate privately |
| `timeout` / `network_error` | Bounded transport failure, not confirmed acceptance |
| `ok: true`, 2xx | Submission accepted only; processing and indexing still unknown |

Auth transport failures may also produce the same sanitized HTTP classifications.
Provider details must be investigated through approved private operational paths,
not added to public API responses or console logs.

## Verification and external dependencies

1. Run `pnpm test`, `pnpm run lint`, and `pnpm run build`. The tests mock Google
   transports and credential loading; no real credential file or Google API is
   required. Helm render tests verify opt-in selectors in both storage modes.
2. After the authorized rollout, fetch robots and all three sitemaps. Compare the
   index across repeated requests. Reconcile child inventory to live public API
   posts (including draft/scheduled filtering), not the checkout alone.
3. Follow representative homepage/archive/card/related/adjacent/pagination links
   with redirects disabled: expect 200, canonical/og:url parity, trailing slash.
   Check old non-slash URLs and page-one aliases still redirect permanently,
   page 2+ works, out-of-range pages 404, RSS/Atom and social PNGs remain valid.
4. In a real browser, load About and a substantive article; record a screenshot,
   DOM/canonical evidence, and successful stylesheet/script/image/font requests.
   Evaluate those public resources against the Google robots group. A spoofed
   Googlebot user-agent success does not prove real Googlebot network access.
5. With owner-authorized credentials and property access, invoke the server
   submission helper (or the established public-post workflow), record only its
   sanitized result, then read the canonical sitemap index and children back via
   Search Console. Record `lastSubmitted`, `isPending`, `lastDownloaded`, warning
   and error counts. Do not treat accepted PUT or zero errors as processed.
6. Obtain the five warning explanations from Search Console's Sitemaps UI and the
   current Page indexing export through browser sign-in. The API counts cannot
   explain the warnings or substitute for the full historical exclusion report.
   These are explicit external evidence dependencies, not known root causes.
7. If processing remains pending, inspect actual Googlebot server/CDN access using
   verified crawler identity. Use Search Console live URL testing and appropriate
   manual indexing requests for priority pages; do not use the restricted Google
   Indexing API for ordinary blog posts.
8. Capture a dated follow-up inspection set with exact canonical and alternate
   URL results and variant-grouped counts. Assess crawled/not-indexed pages for
   duplication, support links and substantive value separately. No indiscriminate
   content removal, rewriting, or forced indexing of low-value tag archives.

Repository tests are local implementation evidence. Deployment verification,
service-account authorization, warning explanations, exports, real Googlebot
access, pending sitemap processing and indexing recovery remain external until
independently verified.
