/* eslint-disable no-console */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildBlogPostingJsonLd,
  buildHomepageJsonLd,
  buildWebSiteJsonLd,
} from "../src/utils/structuredData.ts";
import { buildStaticSitemapXml } from "../src/utils/staticSitemap.ts";
import { GET as docsGet, HEAD as docsHead } from "../src/pages/docs/index.ts";

const source = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const identity = {
  name: "berryhill.dev",
  url: "https://berryhill.dev/",
  description: "Field notes",
  author: "Berryhill",
  authorUrl: "https://berryhill.dev/",
};

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
  } catch (error) {
    failed++;
    console.error(`FAIL ${name}`, error);
  }
}

await test("homepage identities are distinct top-level JSON-LD blocks with linked IDs", () => {
  const nodes = buildHomepageJsonLd(identity);
  assert.deepEqual(nodes.map(node => node["@type"]), ["WebSite", "Person", "Organization"]);
  const [site, person, org] = nodes;
  assert.deepEqual(site, buildWebSiteJsonLd(identity));
  assert.equal(site["@id"], "https://berryhill.dev/#website");
  assert.equal(person["@id"], site.author["@id"]);
  assert.equal(org["@id"], site.publisher["@id"]);
  assert.equal(org.founder["@id"], person["@id"]);
  assert.equal(person.worksFor["@id"], org["@id"]);
  assert.deepEqual(person.sameAs, ["https://www.linkedin.com/in/matthew-berryhill/"]);
  assert.equal(org.email, "matt@berryhill.dev");
  assert.equal(org.sameAs, undefined);
  const home = source("src/pages/index.astro");
  assert.match(home, /jsonLd = buildHomepageJsonLd\(/);
  assert.match(source("src/layouts/Layout.astro"), /jsonLdItems\.map\(item =>/);
});

await test("article retains the old author/publisher shape and does not misattribute guests", () => {
  const article = buildBlogPostingJsonLd({
    title: "Guest work",
    description: "A guest note",
    url: "https://berryhill.dev/posts/guest-work/",
    author: "Guest Writer",
    authorUrl: "https://berryhill.dev/",
    pubDatetime: new Date("2026-01-01T00:00:00Z"),
  });
  assert.equal(article.author[0].name, "Guest Writer");
  assert.equal(article.author[0]["@id"], undefined);
  assert.equal(article.author[0].sameAs, undefined);
  assert.equal(article.publisher["@id"], "https://berryhill.dev/#organization");
  assert.equal(article.dateModified, undefined);
});

await test("getting started, shared/custom navigation and safe public journeys", () => {
  const guide = source("src/pages/start/index.astro");
  const guideText = guide.replace(/\s+/g, " ");
  for (const phrase of ["Getting started", "Research an article", "Subscribe to public writing", "Ask about a project", "no site account or API key", "curl https://berryhill.dev/rss.xml", "no advertised public SDK", "public MCP server", "general-purpose reader API", "mailto:matt@berryhill.dev"]) {
    assert.ok(guideText.includes(phrase), `guide missing ${phrase}`);
  }
  assert.doesNotMatch(guide, /\/api\/posts|x-api-key|credential|admin interface/i);
  for (const path of ["src/pages/index.astro", "src/pages/about.md", "src/components/TerminalPostsArchive.astro", "src/layouts/PostDetails.astro", "src/components/Header.astro", "src/components/Footer.astro"]) {
    assert.match(source(path), /href="\/start\/"/, path);
  }
  assert.match(guide, /class="window proto-window"/);
  assert.match(guide, /aria-current="page"/);
});

await test("docs GET and HEAD permanently redirect to canonical guide", async () => {
  for (const handler of [docsGet, docsHead]) {
    const response = await handler({ url: new URL("https://berryhill.dev/docs/") });
    assert.equal(response.status, 308);
    assert.equal(response.headers.get("Location"), "https://berryhill.dev/start/");
  }
});

await test("llms offers actionable public workflows with real canonical starting URLs", () => {
  const llms = source("src/pages/llms.txt.ts");
  for (const phrase of ["## When to use", "Research: open", "Subscribe: fetch", "Project inquiry: read", "named author", "canonical article URL", "No site account or API key", "matt@berryhill.dev", "Getting started", "getLiveBlogPosts()", "getSortedPosts(posts || []).slice(0, 15)", "toAbsoluteSiteUrl(canonicalURL", "toPostUrl(postPath, website)"]) {
    assert.ok(llms.includes(phrase), `llms missing ${phrase}`);
  }
  assert.doesNotMatch(llms, /\[Home\]/);
  assert.match(llms, /new URL\("start\/", website\)/);
  assert.match(llms, /new URL\("rss\.xml", website\)/);
  assert.match(llms, /CANONICAL_SITEMAP_PATH/);
});

await test("static sitemap adds guide without invented lastmod or redirect-only docs", () => {
  const xml = buildStaticSitemapXml();
  assert.match(xml, /<loc>https:\/\/berryhill\.dev\/start\/<\/loc>/);
  assert.doesNotMatch(xml, /<loc>https:\/\/berryhill\.dev\/docs\//);
  assert.doesNotMatch(xml, /<lastmod>/);
  assert.equal(xml, buildStaticSitemapXml());
  for (const path of ["src/pages/rss.xml.ts", "src/pages/sitemap-posts.xml.ts"]) {
    assert.ok(source(path).length > 0, path);
  }
});

console.log(`PASS ${passed} FAIL ${failed}`);
if (failed) process.exitCode = 1;
