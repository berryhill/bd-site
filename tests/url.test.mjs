/* eslint-disable no-console */
import assert from "node:assert/strict";
import {
  normalizeSiteWebsite,
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
