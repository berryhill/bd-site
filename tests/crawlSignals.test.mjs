/* eslint-disable no-console */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CRAWL_ASSET_DISALLOW_PATHS,
  CRAWLER_USER_AGENTS,
  getCanonicalSitemapUrl,
  getLayoutSitemapHref,
  getRobotsTxt,
} from "../src/utils/crawlSignals.ts";
import {
  REDIRECT_ONLY_SITEMAP_PATHS,
  buildStaticSitemapXml,
  getStaticSitemapPaths,
} from "../src/utils/staticSitemap.ts";

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

function getRobotsGroup(robots, userAgent) {
  const match = robots.match(
    new RegExp(`User-agent: ${userAgent.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?(?=\\n\\nUser-agent:|\\n\\nSitemap:|$)`)
  );

  return match?.[0] ?? "";
}

test("robots.txt points crawlers at canonical sitemap.xml", () => {
  const robots = getRobotsTxt("https://berryhill.dev/");

  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Allow: \//);
  assert.match(robots, /Sitemap: https:\/\/berryhill\.dev\/sitemap\.xml/);
  assert.doesNotMatch(robots, /Sitemap: .*sitemap-index\.xml/);
});

test("robots.txt keeps public pages crawlable while blocking generated search and static asset surfaces", () => {
  const robots = getRobotsTxt("https://berryhill.dev/");
  const genericGroup = getRobotsGroup(robots, "*");

  assert.match(genericGroup, /Allow: \//);
  assert.doesNotMatch(genericGroup, /Disallow: \/posts\//);
  assert.doesNotMatch(genericGroup, /Disallow: \/about\/?/);

  for (const path of CRAWL_ASSET_DISALLOW_PATHS) {
    assert.match(genericGroup, new RegExp(`Disallow: ${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  }
});

test("robots.txt applies pagefind/static disallows to named AI crawler groups", () => {
  const robots = getRobotsTxt("https://berryhill.dev/");

  for (const crawler of ["GPTBot", "ClaudeBot", "PerplexityBot"]) {
    const group = getRobotsGroup(robots, crawler);

    assert.match(group, new RegExp(`User-agent: ${crawler}`));
    assert.match(group, /Allow: \//);
    assert.match(group, /Disallow: \/pagefind\//);
    assert.match(group, /Disallow: \/_astro\//);
    assert.match(group, /Disallow: \/\*\.js\$/);
  }

  assert.equal(
    (robots.match(/^User-agent:/gm) ?? []).length,
    CRAWLER_USER_AGENTS.length
  );
});

test("canonical sitemap helper rejects bad site input instead of emitting invalid robots", () => {
  assert.equal(
    getCanonicalSitemapUrl("https://berryhill.dev"),
    "https://berryhill.dev/sitemap.xml"
  );
  assert.throws(() => getRobotsTxt("not a url"), /Invalid URL/);
});

test("static sitemap URL collection excludes redirect-only sitemap-index.xml", () => {
  const withArchives = getStaticSitemapPaths({ showArchives: true });
  const withoutArchives = getStaticSitemapPaths({ showArchives: false });

  assert.deepEqual(withArchives, ["", "about", "posts", "tags", "search", "archives"]);
  assert.deepEqual(withoutArchives, ["", "about", "posts", "tags", "search"]);

  for (const redirectPath of REDIRECT_ONLY_SITEMAP_PATHS) {
    assert.equal(withArchives.includes(redirectPath), false);
    assert.equal(withoutArchives.includes(redirectPath), false);
  }
});

test("static sitemap XML includes canonical static pages and omits redirect/stale surfaces", () => {
  const xml = buildStaticSitemapXml({
    site: "https://berryhill.dev/",
    showArchives: true,
  });

  assert.match(xml, /<loc>https:\/\/berryhill\.dev\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/berryhill\.dev\/about\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/berryhill\.dev\/search\/<\/loc>/);
  assert.doesNotMatch(xml, /sitemap-index\.xml/);
  assert.doesNotMatch(xml, /pagefind/);
});

test("layout source links the canonical sitemap.xml surface", () => {
  const layout = readFileSync(new URL("../src/layouts/Layout.astro", import.meta.url), "utf8");

  assert.equal(getLayoutSitemapHref(), "/sitemap.xml");
  assert.match(layout, /href=\{sitemapHref\}/);
  assert.doesNotMatch(layout, /href="\/sitemap-index\.xml"/);
});

console.log(`PASS ${passed} FAIL ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
