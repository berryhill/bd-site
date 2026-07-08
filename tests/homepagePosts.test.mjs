/* eslint-disable no-console */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  formatHomepageDate,
  getPostWordCount,
  getReadMinutes,
  selectHomepagePosts,
} from "../src/utils/homepagePosts.ts";

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

function post(id, { featured = false, body = "one two three", date = "2026-01-02T00:00:00.000Z" } = {}) {
  return {
    id,
    body,
    filePath: `src/data/blog/${id}.md`,
    data: {
      featured,
      title: id,
      description: `${id} description`,
      pubDatetime: date,
      tags: ["agents"],
    },
  };
}

const homepageSource = readFileSync(new URL("../src/pages/index.astro", import.meta.url), "utf8");
const globalCssSource = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");

test("selectHomepagePosts returns featured and recent paths without mixing non-featured cards", () => {
  const posts = [post("featured-1", { featured: true }), post("recent-1"), post("featured-2", { featured: true }), post("recent-2")];
  const { featuredPosts, recentPosts } = selectHomepagePosts(posts);

  assert.deepEqual(featuredPosts.map(({ id }) => id), ["featured-1", "featured-2"]);
  assert.deepEqual(recentPosts.map(({ id }) => id), ["recent-1", "recent-2"]);
});

test("selectHomepagePosts handles empty and all-non-featured inventories", () => {
  assert.deepEqual(selectHomepagePosts([]), { featuredPosts: [], recentPosts: [] });

  const { featuredPosts, recentPosts } = selectHomepagePosts([post("recent-1"), post("recent-2")]);
  assert.equal(featuredPosts.length, 0);
  assert.deepEqual(recentPosts.map(({ id }) => id), ["recent-1", "recent-2"]);
});

test("selectHomepagePosts caps homepage featured and recent lists", () => {
  const posts = Array.from({ length: 6 }, (_, index) => post(`featured-${index}`, { featured: true })).concat(
    Array.from({ length: 6 }, (_, index) => post(`recent-${index}`))
  );
  const { featuredPosts, recentPosts } = selectHomepagePosts(posts);

  assert.equal(featuredPosts.length, 4);
  assert.equal(recentPosts.length, 4);
});

test("homepage post metadata helpers handle word-count, one-minute floor, and invalid dates", () => {
  assert.equal(getPostWordCount(post("words", { body: "  alpha beta\n gamma  " })), 3);
  assert.equal(getReadMinutes(post("short", { body: "one two" })), 1);
  assert.equal(getReadMinutes(post("long", { body: Array.from({ length: 440 }, () => "word").join(" ") })), 2);
  assert.equal(formatHomepageDate("not-a-date"), "pending");
  assert.equal(formatHomepageDate(null), "pending");
  assert.equal(formatHomepageDate(new Date("2026-03-04T12:00:00.000Z")), "2026-03-04");
});

test("homepage renders pinned card styling only behind the featured-post guard", () => {
  assert.match(homepageSource, /featuredPosts\.length > 0 &&/);
  assert.match(homepageSource, /class="files featured-files"/);
  assert.match(homepageSource, /class="file featured-file"/);
  assert.match(homepageSource, /aria-label=\{`Read featured post: \$\{post\.data\.title\}`\}/);
  assert.match(homepageSource, /class="open">open →<\/span>/);
});

test("featured-card CSS creates the intentional pinned treatment without changing recent rows", () => {
  assert.match(globalCssSource, /\.featured-file\s*\{[\s\S]*min-height:\s*236px;/);
  assert.match(globalCssSource, /\.featured-file::before\s*\{[\s\S]*height:\s*3px;/);
  assert.match(globalCssSource, /\.featured-file::after\s*\{[\s\S]*featured artifact/);
  assert.match(globalCssSource, /\.featured-file \.stat \.open\s*\{[\s\S]*margin-left:\s*auto;/);
  assert.match(globalCssSource, /\.ls-row\s*\{[\s\S]*grid-template-columns:\s*24px 90px 1fr 110px 36px;/);
});

console.log(`PASS ${passed} FAIL ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
