/* eslint-disable no-console */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SITE } from "../src/config.ts";
import {
  buildBlogPostingJsonLd,
  buildPersonJsonLd,
  buildWebSiteJsonLd,
} from "../src/utils/structuredData.ts";
import { buildStaticSitemapXml } from "../src/utils/staticSitemap.ts";

const source = path => readFileSync(new URL(path, import.meta.url), "utf8");
let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (error) {
    failed++;
    console.error(`FAIL ${name}`, error);
  }
}

test("homepage has a single main, labeled navigation, and named command field", () => {
  const home = source("../src/pages/index.astro");
  assert.equal((home.match(/<main\b/g) ?? []).length, 1);
  assert.match(home, /<nav\s+[^>]*aria-label="Site navigation"/);
  assert.match(home, /<label\s+[^>]*for="home-command"/);
  assert.match(home, /<input\s+[^>]*id="home-command"/);
  assert.match(home, /<h1>/);
  assert.match(home, /<h2>/);
  assert.match(home, /\.cmdbar:focus-within\s*\{\s*outline: 2px solid var\(--accent\)/);
  assert.match(home, /event\.metaKey \|\| event\.ctrlKey/);
  assert.match(home, /fleet: "\/#fleet"/);
});

test("stable identities link site and Matt without assigning his identity to guest authors", () => {
  const site = buildWebSiteJsonLd({ name: SITE.title, url: SITE.website, description: SITE.desc, author: SITE.author, authorUrl: SITE.profile });
  const about = buildPersonJsonLd({ name: "Matthew Berryhill", url: "https://berryhill.dev/about/" });
  assert.equal(site["@id"], `${SITE.website}#website`);
  assert.equal(site.author["@id"], about["@id"]);
  assert(site.author.sameAs.includes("https://www.linkedin.com/in/matthew-berryhill/"));
  assert.equal(site.publisher["@id"], `${SITE.website}#organization`);
  assert(about.sameAs.includes("https://www.linkedin.com/in/matthew-berryhill/"));
  const post = { title: "Guest note", description: "Test", url: "https://berryhill.dev/posts/guest/", author: "Guest Author", authorUrl: SITE.profile, pubDatetime: new Date("2026-01-01T00:00:00Z") };
  const guest = buildBlogPostingJsonLd(post);
  assert.equal(guest.author[0].name, "Guest Author");
  assert.equal(guest.author[0]["@id"], undefined);
  assert.equal(guest.author[0].url, undefined);
  const guestWithProfile = buildBlogPostingJsonLd({ ...post, authorUrl: "https://example.org/guest/" });
  assert.equal(guestWithProfile.author[0].url, "https://example.org/guest/");
  assert.equal(guestWithProfile.author[0]["@id"], undefined);
  assert.equal(guest.publisher["@id"], `${SITE.website}#organization`);
  assert.equal(guest.dateModified, undefined);
  const matt = buildBlogPostingJsonLd({ ...post, author: "Matt Berryhill" });
  assert.equal(matt.author[0]["@id"], about["@id"]);
});

test("RSS HTTP discovery and llms.txt guidance advertise only real resources", () => {
  const middleware = source("../src/middleware.ts");
  const llms = source("../src/pages/llms.txt.ts");
  assert.match(middleware, /headers\.append\(\s*"Link",[\s\S]*?application\/rss\+xml/);
  assert.match(middleware, /return new Response\(response\.body/);
  assert.match(llms, /When to use/i);
  assert.match(llms, /Limitations/i);
  assert.match(llms, /Attribution/i);
  assert.match(llms, /Privacy/);
  assert.match(llms, /getLiveBlogPosts\(\)/);
});

test("trust links and source-specific privacy disclosure avoid false zero-tracker claim", () => {
  const home = source("../src/pages/index.astro");
  const about = source("../src/pages/about.md");
  const privacy = source("../src/pages/privacy.astro");
  assert.match(home, /href="\/about\/"/);
  assert.match(home, /href="\/privacy\/"/);
  assert.match(about, /href="\/privacy\/"/);
  assert.match(privacy, /Google Analytics 4/);
  assert.match(privacy, /PUBLIC_GA_MEASUREMENT_ID/);
  assert.match(privacy, /mailto:matt@berryhill\.dev/);
  assert.doesNotMatch(home, /zero trackers/);
  const archive = source("../src/components/TerminalPostsArchive.astro");
  assert.doesNotMatch(archive, /zero trackers/);
  assert.match(archive, /href="\/privacy\/"/);
});

test("custom terminal layouts retain landmarks and source-backed article attribution", () => {
  for (const file of ["../src/pages/about.md", "../src/components/TerminalPostsArchive.astro", "../src/layouts/PostDetails.astro"]) {
    const text = source(file);
    assert.match(text, /role="main"/);
    assert.match(text, /role="navigation" aria-label="Site navigation"/);
  }
  const post = source("../src/layouts/PostDetails.astro");
  assert.match(post, /resolvedAuthor = author \?\? SITE\.author/);
  assert.match(post, /<b>\{resolvedAuthor\}<\/b>/);
  assert.match(post, /href="\/about\/"/);
  const llms = source("../src/pages/llms.txt.ts");
  assert.match(llms, /toAbsoluteSiteUrl\(canonicalURL, website,\s*\{\s*trailingSlash: true/);
  assert.match(llms, /toPostUrl\(postPath, website\)/);
});

test("static and index sitemaps omit unsourced lastmod, leaving post sitemap intact", () => {
  const staticXml = buildStaticSitemapXml({ site: SITE.website, showArchives: false });
  assert(staticXml.includes("https://berryhill.dev/privacy/"));
  assert.doesNotMatch(staticXml, /<lastmod>/);
  assert.doesNotMatch(source("../src/pages/sitemap.xml.ts"), /<lastmod>/);
  assert.match(source("../src/pages/sitemap-posts.xml.ts"), /lastmod/);
});

console.log(`PASS ${passed} FAIL ${failed}`);
if (failed) process.exitCode = 1;
