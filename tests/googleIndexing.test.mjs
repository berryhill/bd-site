import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { getRobotsTxt } from "../src/utils/crawlSignals.ts";
import { getRobotsDecision } from "../src/utils/socialPreviewReadiness.ts";
import { GET } from "../src/pages/sitemap.xml.ts";
import * as urls from "../src/utils/url.ts";

const source = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Google rendering and image crawlers can fetch public resources, not search-index noise", () => {
  const robots = getRobotsTxt();
  for (const agent of ["Googlebot", "Googlebot-Image"]) {
    for (const path of ["/posts/example/", "/_astro/site.css", "/_astro/client.js", "/toggle-theme.js", "/assets/blog/example/diagram.svg", "/assets/blog/example/photo.webp", "/favicon.svg", "/favicon.ico", "/posts/example/index.png"]) {
      const decision = getRobotsDecision(robots, agent, `https://berryhill.dev${path}`);
      assert.equal(decision.allowed, true, `${agent} ${path}`);
      assert.equal(decision.group, agent);
    }
    assert.equal(getRobotsDecision(robots, agent, "https://berryhill.dev/pagefind/index.json").allowed, false);
  }
  for (const agent of ["GPTBot", "ClaudeBot", "Google-Extended", "GoogleOther", "unknown-bot"]) {
    assert.equal(getRobotsDecision(robots, agent, "https://berryhill.dev/_astro/site.css").allowed, false);
  }
  assert.equal(getRobotsDecision(robots, "Twitterbot", "https://berryhill.dev/posts/example/index.png").allowed, true);
});

test("sitemap index responses are stable and do not invent child modification dates", async () => {
  const first = await GET({});
  assert.equal(first.status, 200);
  assert.match(first.headers.get("content-type"), /application\/xml/);
  const xml = await first.text();
  assert.doesNotMatch(xml, /<lastmod>/);
  assert.equal(await (await GET({})).text(), xml);
  assert.match(xml, /https:\/\/berryhill.dev\/sitemap-static.xml/);
  assert.match(xml, /https:\/\/berryhill.dev\/sitemap-posts.xml/);
});

test("HTML navigation helper preserves query/hash and canonical page-one aliases without altering assets", () => {
  assert.equal(urls.toCanonicalHtmlPath("/posts/example"), "/posts/example/");
  assert.equal(urls.toCanonicalHtmlPath("/posts/page/2?x=1#top"), "/posts/page/2/?x=1#top");
  assert.equal(urls.toCanonicalHtmlPath("/posts/page/1"), "/posts/");
  assert.equal(urls.toCanonicalHtmlPath("/posts/example/index.png"), "/posts/example/index.png");
});

test("all post navigation surfaces normalize raw getPath output, but generated OG stays raw", () => {
  for (const file of ["src/pages/index.astro", "src/components/TerminalPostsArchive.astro", "src/components/Card.astro", "src/components/RelatedPosts.astro", "src/layouts/PostDetails.astro"]) {
    const text = source(file);
    assert.match(text, /toCanonicalHtmlPath\(\s*getPath\(/, file);
    assert.doesNotMatch(text, /href=\{getPath\(/, file);
  }
  assert.match(source("src/layouts/PostDetails.astro"), /\$\{getPath\(post.id, post.filePath\)\}\/index.png/);
  assert.match(source("src/components/Pagination.astro"), /toCanonicalHtmlPath\(page.url.prev/);
  assert.match(source("src/components/Pagination.astro"), /toCanonicalHtmlPath\(page.url.next/);
});
