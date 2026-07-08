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
const postsArchiveSource = readFileSync(new URL("../src/components/TerminalPostsArchive.astro", import.meta.url), "utf8");
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

test("featured and archive pinned cards share compact terminal styling without decorative artifacts", () => {
  assert.match(postsArchiveSource, /aria-label=\{`Read pinned post: \$\{post\.data\.title\}`\}/);
  assert.match(postsArchiveSource, /<span class="ext">PINNED<\/span>/);
  assert.doesNotMatch(postsArchiveSource, /style="color: var\(--warn\);"/);
  assert.doesNotMatch(globalCssSource, /featured artifact/);
  assert.doesNotMatch(globalCssSource, /\.featured-file::(?:before|after)/);
  assert.doesNotMatch(globalCssSource, /\.pin::before\s*\{[\s\S]*📌/);
  assert.match(
    globalCssSource,
    /\.files,\s*\n\.pinned\s*\{[\s\S]*grid-template-columns:\s*1fr 1fr;[\s\S]*gap:\s*12px;/
  );
  assert.match(
    globalCssSource,
    /@media \(max-width: 820px\) \{[\s\S]*\.files,\s*\n\s*\.pinned\s*\{[\s\S]*grid-template-columns:\s*1fr;/
  );
  assert.match(
    globalCssSource,
    /\.featured-file,\s*\n\.pin\s*\{[\s\S]*border:\s*1px solid color-mix\(in srgb, var\(--accent\) 24%, var\(--border\)\);[\s\S]*border-radius:\s*7px;[\s\S]*padding:\s*14px 14px 15px;[\s\S]*background:\s*var\(--surface\);[\s\S]*text-decoration:\s*none;/
  );
  assert.match(
    globalCssSource,
    /\.featured-file \.name,\s*\n\.pin \.name\s*\{[\s\S]*font-size:\s*clamp\(15px, 1\.35vw, 17px\);[\s\S]*line-height:\s*1\.3;/
  );
  assert.match(globalCssSource, /\.featured-file \.stat,\s*\n\.pin \.meta\s*\{[\s\S]*gap:\s*16px;/);
  assert.match(globalCssSource, /\.featured-file \.stat \.open\s*\{[\s\S]*margin-left:\s*auto;/);
  assert.match(globalCssSource, /\.ls-row\s*\{[\s\S]*grid-template-columns:\s*24px 90px 1fr 110px 36px;/);
});

console.log(`PASS ${passed} FAIL ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
