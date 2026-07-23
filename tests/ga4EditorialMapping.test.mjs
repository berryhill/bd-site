/* eslint-disable no-console */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildCanonicalLivePostInventory,
  joinGa4EditorialMappings,
  normalizeGa4ArticlePath,
} from "../src/utils/ga4EditorialMapping.ts";

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

test("normalizes article URLs to one canonical slug and post path", () => {
  assert.deepEqual(
    normalizeGa4ArticlePath("https://berryhill.dev/posts/agentic-systems/?utm_source=x#read"),
    {
      slug: "agentic-systems",
      path: "/posts/agentic-systems/",
    }
  );
  assert.deepEqual(normalizeGa4ArticlePath("/posts/live-api-only"), {
    slug: "live-api-only",
    path: "/posts/live-api-only/",
  });
  assert.deepEqual(normalizeGa4ArticlePath("posts/double-normalized"), {
    slug: "double-normalized",
    path: "/posts/double-normalized/",
  });
});

test("rejects invalid article path candidates instead of inventing slugs", () => {
  for (const path of [
    "",
    "not-a-post",
    "/posts/%E0%A4%A",
    "/posts/encoded%2Fslash",
    "/posts/too/deep",
  ]) {
    assert.equal(normalizeGa4ArticlePath(path), null, path);
  }
});

test("excludes archive and system routes from article mapping coverage", () => {
  for (const path of [
    "/posts/",
    "/posts/page/1",
    "/posts/page/12/",
    "/posts/agentic-systems/index.png",
    "/api/posts",
    "/rss.xml",
    "/atom.xml",
    "/feed.xml",
    "/sitemap.xml",
    "/og.png",
    "/search",
    "/tags/ai/",
  ]) {
    assert.equal(normalizeGa4ArticlePath(path), null, path);
  }
});

test("builds a canonical live inventory from API/PVC rows without relying on checkout files", () => {
  const inventory = buildCanonicalLivePostInventory([
    { slug: "live-api-only", title: "Live API Only", tags: ["agentic-dev"] },
    { id: "repo-backed", data: { title: "Repo Backed", tags: ["ops"] } },
    { path: "/posts/path-derived/", title: "Path Derived" },
    { slug: "live-api-only", title: "Duplicate should not repeat" },
    { path: "/posts/page/1", title: "Archive" },
  ]);

  assert.deepEqual(
    inventory.map(post => post.slug),
    ["live-api-only", "repo-backed", "path-derived"]
  );
  assert.equal(inventory[0].canonicalPath, "/posts/live-api-only/");
  assert.equal(inventory[0].title, "Live API Only");
  assert.equal(inventory[0].primaryTag, "agentic-dev");
});

test("joins GA4 rows to live inventory and keeps no-data, editorial-missing, and phantom states distinct", () => {
  const model = joinGa4EditorialMappings({
    livePosts: [
      { slug: "live-api-only", title: "Live API Only", tags: ["agentic-dev"] },
      { slug: "quiet-post", title: "Quiet Post" },
    ],
    ga4Rows: [
      { path: "/posts/live-api-only/", views: 12, users: 5 },
      { path: "/posts/deleted-test-post/", views: 3, users: 1 },
      { path: "/posts/page/1", views: 99, users: 20 },
    ],
    editorialRecords: [{ slug: "live-api-only", score: 0.92 }],
    ga4MeasuredAt: "2026-07-23T10:00:00.000Z",
    generatedAt: "2026-07-23T11:00:00.000Z",
  });

  assert.equal(model.summary.liveInventoryTotal, 2);
  assert.equal(model.summary.joinedLiveRows, 2);
  assert.equal(model.summary.mappingBreakdown.ga4_joined, 1);
  assert.equal(model.summary.mappingBreakdown.no_data_in_window, 1);
  assert.equal(model.summary.phantomCount, 1);
  assert.equal(model.summary.ga4MeasuredAt, "2026-07-23T10:00:00.000Z");
  assert.equal(model.summary.generatedAt, "2026-07-23T11:00:00.000Z");

  assert.deepEqual(
    model.rows.map(row => [row.slug, row.mappingStatus, row.editorialStatus]),
    [
      ["live-api-only", "ga4_joined", "editorial_joined"],
      ["quiet-post", "no_data_in_window", "editorial_metadata_missing"],
    ]
  );
  assert.deepEqual(model.phantoms.map(row => row.slug), ["deleted-test-post"]);
});

test("layout disables GA4 default pageview and emits one explicit page_view on astro page load", () => {
  const layout = readFileSync(new URL("../src/layouts/Layout.astro", import.meta.url), "utf8");

  assert.match(layout, /send_page_view/);
  assert.match(layout, /__bdGa4PageviewListenerInstalled/);
  assert.match(layout, /__bdGa4PageviewParams/);
  assert.match(layout, /document\.addEventListener\("astro:page-load"/);
  assert.equal((layout.match(/gtag\("event", "page_view"/g) ?? []).length, 1);
  assert.equal(
    (layout.match(/document\.addEventListener\("astro:page-load"/g) ?? []).length,
    1
  );
  assert.doesNotMatch(layout, /if \(typeof gtag !== "undefined"\) \{\s*gtag\("event", "page_view"\);\s*\}\s*document\.addEventListener/s);
});

test("post detail pages inherit GA4 article parameters through the shared layout", () => {
  const postDetails = readFileSync(new URL("../src/layouts/PostDetails.astro", import.meta.url), "utf8");
  const layout = readFileSync(new URL("../src/layouts/Layout.astro", import.meta.url), "utf8");

  assert.match(postDetails, /<Layout[\s\S]*pageType="article"/);
  assert.match(postDetails, /canonicalURL=\{postUrl\}/);
  assert.match(postDetails, /primaryTag=\{lane\}/);
  assert.match(layout, /post_slug: gaArticlePath\.slug/);
  assert.match(layout, /canonical_post_path: gaArticlePath\.path/);
  assert.match(layout, /primary_tag: primaryTag/);
});

console.log(`PASS ${passed} FAIL ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
