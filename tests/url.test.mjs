/* eslint-disable no-console */
import assert from "node:assert/strict";
import {
  acceptsHtmlResponse,
  getAlternateHtmlPathname,
  getCanonicalHtmlRedirectLocation,
  normalizeCanonicalHtmlUrl,
  normalizeSiteWebsite,
  shouldEnforceTrailingSlash,
  toAbsoluteSiteUrl,
  toPostAssetUrl,
  toPostUrl,
} from "../src/utils/url.ts";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(error);
  }
}

test("normalizes SITE.website to one trailing slash", () => {
  assert.equal(normalizeSiteWebsite("https://berryhill.dev"), "https://berryhill.dev/");
  assert.equal(normalizeSiteWebsite("https://berryhill.dev/"), "https://berryhill.dev/");
  assert.equal(normalizeSiteWebsite("https://berryhill.dev//"), "https://berryhill.dev/");
});

test("builds absolute post URLs without double slashes or duplicated posts path", () => {
  assert.equal(
    toPostUrl("/posts/agentic-workflows", "https://berryhill.dev/"),
    "https://berryhill.dev/posts/agentic-workflows/"
  );
  assert.equal(
    toPostUrl("posts/agentic-workflows/", "https://berryhill.dev"),
    "https://berryhill.dev/posts/agentic-workflows/"
  );
  assert.equal(
    toPostUrl("agentic-workflows", "https://berryhill.dev//"),
    "https://berryhill.dev/posts/agentic-workflows/"
  );
});

test("preserves nested post paths and query strings while enforcing a trailing slash", () => {
  assert.equal(
    toPostUrl("/posts/field-notes/agentic-workflows?utm_source=test", "https://berryhill.dev/"),
    "https://berryhill.dev/posts/field-notes/agentic-workflows/?utm_source=test"
  );
});

test("normalizes site-relative OG assets against SITE.website", () => {
  assert.equal(
    toAbsoluteSiteUrl("/assets/blog/agentic-workflows/diagram.png", "https://berryhill.dev/"),
    "https://berryhill.dev/assets/blog/agentic-workflows/diagram.png"
  );
  assert.equal(
    toPostAssetUrl("/posts/agentic-workflows", "index.png", "https://berryhill.dev/"),
    "https://berryhill.dev/posts/agentic-workflows/index.png"
  );
});

test("preserves already-absolute OG and canonical URLs", () => {
  assert.equal(
    toAbsoluteSiteUrl("https://cdn.example.com/og.png", "https://berryhill.dev/"),
    "https://cdn.example.com/og.png"
  );
  assert.equal(
    toPostUrl("https://example.com/canonical-post", "https://berryhill.dev/"),
    "https://example.com/canonical-post/"
  );
});

test("canonical HTML URLs enforce trailing slashes for route-like paths", () => {
  assert.equal(
    normalizeCanonicalHtmlUrl("/about", "https://berryhill.dev/").href,
    "https://berryhill.dev/about/"
  );
  assert.equal(
    normalizeCanonicalHtmlUrl("https://berryhill.dev/posts/example?utm=1#top").href,
    "https://berryhill.dev/posts/example/?utm=1#top"
  );
  assert.equal(
    normalizeCanonicalHtmlUrl("/", "https://berryhill.dev/").href,
    "https://berryhill.dev/"
  );
});

test("trailing slash enforcement excludes APIs, XML feeds, assets, and generated images", () => {
  assert.equal(shouldEnforceTrailingSlash("/api/posts"), false);
  assert.equal(shouldEnforceTrailingSlash("/robots.txt"), false);
  assert.equal(shouldEnforceTrailingSlash("/sitemap.xml"), false);
  assert.equal(shouldEnforceTrailingSlash("/rss.xml"), false);
  assert.equal(shouldEnforceTrailingSlash("/assets/blog/example/diagram.svg"), false);
  assert.equal(shouldEnforceTrailingSlash("/posts/example/index.png"), false);
  assert.equal(shouldEnforceTrailingSlash("/about"), true);
});

test("HTML alternate path detection ignores non-HTML crawl surfaces", () => {
  assert.equal(getAlternateHtmlPathname("/about/"), "/about");
  assert.equal(getAlternateHtmlPathname("/about"), "/about/");
  assert.equal(getAlternateHtmlPathname("/"), null);
  assert.equal(getAlternateHtmlPathname("/api/posts"), null);
  assert.equal(getAlternateHtmlPathname("/rss.xml"), null);
  assert.equal(getAlternateHtmlPathname("/posts/example/index.png"), null);
});

test("canonical HTML redirect helper redirects GET and HEAD route-like paths", () => {
  assert.equal(
    getCanonicalHtmlRedirectLocation(
      "GET",
      "https://berryhill.dev/posts/example?utm_source=test",
      "text/html"
    ),
    "/posts/example/?utm_source=test"
  );
  assert.equal(
    getCanonicalHtmlRedirectLocation(
      "HEAD",
      "https://berryhill.dev/about#team",
      "text/html,application/xhtml+xml"
    ),
    "/about/#team"
  );
});

test("canonical HTML redirect helper passes through non-GET and non-HTML requests", () => {
  assert.equal(
    getCanonicalHtmlRedirectLocation("POST", "https://berryhill.dev/about", "text/html"),
    null
  );
  assert.equal(
    getCanonicalHtmlRedirectLocation("PUT", "https://berryhill.dev/about", "*/*"),
    null
  );
  assert.equal(
    getCanonicalHtmlRedirectLocation("GET", "https://berryhill.dev/about", "application/json"),
    null
  );
  assert.equal(acceptsHtmlResponse("application/json, image/png"), false);
  assert.equal(acceptsHtmlResponse("text/html;q=0, application/json"), false);
  assert.equal(acceptsHtmlResponse("text/*;q=0.8, application/json"), true);
  assert.equal(acceptsHtmlResponse(null), true);
});

test("canonical HTML redirect helper excludes canonical, API, and file-like paths", () => {
  assert.equal(
    getCanonicalHtmlRedirectLocation("GET", "https://berryhill.dev/about/", "text/html"),
    null
  );
  assert.equal(
    getCanonicalHtmlRedirectLocation("GET", "https://berryhill.dev/api/posts", "text/html"),
    null
  );
  assert.equal(
    getCanonicalHtmlRedirectLocation("GET", "https://berryhill.dev/rss.xml", "text/html"),
    null
  );
  assert.equal(
    getCanonicalHtmlRedirectLocation("GET", "https://berryhill.dev/assets/blog/post/figure.svg", "*/*"),
    null
  );
  assert.equal(
    getCanonicalHtmlRedirectLocation("GET", "https://berryhill.dev/posts/example/index.png", "*/*"),
    null
  );
});

test("throws for invalid URL inputs", () => {
  assert.throws(() => normalizeSiteWebsite(""), /SITE\.website/);
  assert.throws(() => normalizeSiteWebsite("not a url"), /Invalid URL/);
  assert.throws(() => toAbsoluteSiteUrl("", "https://berryhill.dev/"), /URL path/);
  assert.throws(() => toPostUrl("  ", "https://berryhill.dev/"), /Post path/);
});

console.log(`PASS ${passed} FAIL ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
