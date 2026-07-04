/* eslint-disable no-console */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getPublicPosts,
  isIgnoredPost,
  isPublicPost,
  isPublishTimePassed,
} from "../src/utils/postFilter.ts";

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

const now = new Date("2026-01-01T12:00:00.000Z");
const margin = 15 * 60 * 1000;

function post(overrides = {}) {
  const { data = {}, ...entryOverrides } = overrides;

  return {
    id: "published-post",
    filePath: "published-post.md",
    ...entryOverrides,
    data: {
      title: "Published Post",
      pubDatetime: "2026-01-01T11:00:00.000Z",
      draft: false,
      ...data,
    },
  };
}

test("public post filter keeps published posts whose publish time is inside the scheduled margin", () => {
  const entries = [
    post({ id: "old", data: { pubDatetime: "2025-12-31T12:00:00.000Z" } }),
    post({ id: "within-margin", data: { pubDatetime: "2026-01-01T12:10:00.000Z" } }),
  ];

  assert.deepEqual(
    getPublicPosts(entries, { now, scheduledPostMargin: margin }).map(entry => entry.id),
    ["old", "within-margin"]
  );
});

test("public post filter excludes drafts, private underscore paths, and posts beyond the scheduled margin", () => {
  const entries = [
    post({ id: "published" }),
    post({ id: "draft", data: { draft: true } }),
    post({ id: "future", data: { pubDatetime: "2026-01-01T12:16:00.000Z" } }),
    post({ id: "_private" }),
    post({ id: "nested/private", filePath: "nested/_private.md" }),
  ];

  assert.deepEqual(
    getPublicPosts(entries, { now, scheduledPostMargin: margin }).map(entry => entry.id),
    ["published"]
  );
});

test("invalid or missing publish dates are treated as non-public instead of leaking into machine-readable routes", () => {
  assert.equal(
    isPublishTimePassed(post({ data: { pubDatetime: "not-a-date" } }), {
      now,
      scheduledPostMargin: margin,
    }),
    false
  );
  assert.equal(
    isPublicPost(post({ data: { pubDatetime: undefined } }), {
      now,
      scheduledPostMargin: margin,
    }),
    false
  );
});

test("underscore path detection checks both IDs and file paths", () => {
  assert.equal(isIgnoredPost(post({ id: "_draft-note" })), true);
  assert.equal(isIgnoredPost(post({ id: "notes/public", filePath: "notes/_private.md" })), true);
  assert.equal(isIgnoredPost(post({ id: "notes/public", filePath: "notes/public.md" })), false);
});

test("RSS, Atom, llms.txt, and sitemap posts routes use the shared sorted public-post filter", () => {
  const routes = [
    "../src/pages/rss.xml.ts",
    "../src/pages/atom.xml.ts",
    "../src/pages/llms.txt.ts",
    "../src/pages/sitemap-posts.xml.ts",
  ];

  for (const route of routes) {
    const source = readFileSync(new URL(route, import.meta.url), "utf8");
    assert.match(source, /getSortedPosts/);
  }
});

console.log(`PASS ${passed} FAIL ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}