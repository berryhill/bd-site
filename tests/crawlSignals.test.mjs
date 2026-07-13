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
  HIDDEN_STATIC_SITEMAP_PATHS,
  REDIRECT_ONLY_SITEMAP_PATHS,
  buildStaticSitemapResponse,
  buildStaticSitemapXml,
  getStaticSitemapPaths,
} from "../src/utils/staticSitemap.ts";
import { SITE } from "../src/config.ts";

let passed = 0;
let failed = 0;
const pending = [];

function recordFailure(name, error) {
  failed += 1;
  console.error(`FAIL ${name}`);
  console.error(error);
}

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === "function") {
      pending.push(
        result.then(() => (passed += 1)).catch(error => recordFailure(name, error))
      );
      return;
    }
    passed += 1;
  } catch (error) {
    recordFailure(name, error);
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

test("static sitemap URL collection excludes redirect-only and hidden 404 surfaces", () => {
  const withArchives = getStaticSitemapPaths({ showArchives: true });
  const withoutArchives = getStaticSitemapPaths({ showArchives: false });

  assert.deepEqual(withArchives, ["", "about", "posts", "tags"]);
  assert.deepEqual(withoutArchives, ["", "about", "posts", "tags"]);

  for (const redirectPath of REDIRECT_ONLY_SITEMAP_PATHS) {
    assert.equal(withArchives.includes(redirectPath), false);
    assert.equal(withoutArchives.includes(redirectPath), false);
  }

  for (const hiddenPath of HIDDEN_STATIC_SITEMAP_PATHS) {
    assert.equal(withArchives.includes(hiddenPath), false);
    assert.equal(withoutArchives.includes(hiddenPath), false);
  }
});

test("static sitemap XML includes canonical static pages and omits redirect/stale surfaces", () => {
  const xml = buildStaticSitemapXml({
    site: "https://berryhill.dev/",
    showArchives: true,
  });

  assert.match(xml, /<loc>https:\/\/berryhill\.dev\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/berryhill\.dev\/about\/<\/loc>/);
  assert.doesNotMatch(xml, /<loc>https:\/\/berryhill\.dev\/archives\/<\/loc>/);
  assert.doesNotMatch(xml, /<loc>https:\/\/berryhill\.dev\/search\/<\/loc>/);
  assert.doesNotMatch(xml, /sitemap-index\.xml/);
  assert.doesNotMatch(xml, /pagefind/);
});

test("static sitemap route response cannot advertise the 404-only archives surface", async () => {
  const response = buildStaticSitemapResponse({
    site: SITE.website,
    showArchives: SITE.showArchives,
  });
  const xml = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "application/xml; charset=utf-8");
  assert.match(xml, /<loc>https:\/\/berryhill\.dev\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/berryhill\.dev\/about\/<\/loc>/);
  assert.doesNotMatch(xml, /<loc>https:\/\/berryhill\.dev\/archives\/<\/loc>/);
  assert.doesNotMatch(xml, /sitemap-index\.xml/);
});

test("archives config stays disabled while the archives route intentionally returns 404", () => {
  const archivesSource = readFileSync(
    new URL("../src/pages/archives/index.astro", import.meta.url),
    "utf8"
  );

  assert.equal(SITE.showArchives, false);
  assert.match(archivesSource, /return new Response\(null, \{ status: 404 \}\);/);
});

test("layout source links the canonical sitemap.xml surface", () => {
  const layout = readFileSync(new URL("../src/layouts/Layout.astro", import.meta.url), "utf8");

  assert.equal(getLayoutSitemapHref(), "/sitemap.xml");
  assert.match(layout, /href=\{sitemapHref\}/);
  assert.doesNotMatch(layout, /href="\/sitemap-index\.xml"/);
});

await Promise.all(pending);

console.log(`PASS ${passed} FAIL ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
