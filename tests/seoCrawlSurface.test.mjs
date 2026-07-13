/* eslint-disable no-console */
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  auditInternalPostLinks,
  auditLocalCrawlSurface,
  auditPublishedPostTitleQuality,
  extractXmlLocs,
  isMalformedCrawlUrl,
  loadSourcePosts,
  normalizePostPath,
} from "../scripts/checkSeoCrawlSurface.mjs";

let passed = 0;
let failed = 0;
const pending = [];

function test(name, fn) {
  pending.push(
    Promise.resolve()
      .then(fn)
      .then(() => {
        passed += 1;
      })
      .catch(error => {
        failed += 1;
        console.error(`FAIL ${name}`);
        console.error(error);
      })
  );
}

async function withTempContent(files, fn) {
  const root = await mkdtemp(path.join(tmpdir(), "seo-crawl-surface-"));
  try {
    for (const [relativePath, content] of Object.entries(files)) {
      const filePath = path.join(root, relativePath);
      await writeFile(filePath, content, "utf8");
    }
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function markdown({ title, draft = false, pubDatetime = "2024-01-01T00:00:00Z", body = "" }) {
  return `---
title: "${title}"
description: "${title} description"
pubDatetime: ${pubDatetime}
draft: ${draft}
tags: ["test"]
---

${body}
`;
}

test("normalizes only berryhill post routes", () => {
  assert.equal(normalizePostPath("/posts/example"), "/posts/example/");
  assert.equal(normalizePostPath("https://berryhill.dev/posts/example/?utm=1"), "/posts/example/");
  assert.equal(normalizePostPath("https://example.com/posts/example/"), null);
  assert.equal(normalizePostPath("/about/"), null);
});

test("flags malformed crawl URLs and non-berryhill locations", () => {
  assert.equal(isMalformedCrawlUrl("https://berryhill.dev/posts/good/"), false);
  assert.equal(isMalformedCrawlUrl("https://berryhill.dev/posts//bad/"), true);
  assert.equal(isMalformedCrawlUrl("https://example.com/posts/good/"), true);
  assert.equal(isMalformedCrawlUrl("not a url"), true);
});

test("extracts XML loc values for sitemap/feed checks", () => {
  assert.deepEqual(
    extractXmlLocs("<url><loc>https://berryhill.dev/</loc></url><loc>https://berryhill.dev/posts/a/</loc>"),
    ["https://berryhill.dev/", "https://berryhill.dev/posts/a/"]
  );
});

test("detects public posts linking to draft-only routes", async () => {
  await withTempContent(
    {
      "published.md": markdown({
        title: "Published",
        body: "This links to [future work](/posts/forthcoming/).",
      }),
      "forthcoming.md": markdown({ title: "Forthcoming", draft: true }),
    },
    async contentDir => {
      const posts = await loadSourcePosts({ contentDir, now: new Date("2025-01-01T00:00:00Z").getTime() });
      const issues = auditInternalPostLinks(posts);

      assert.equal(issues.length, 1);
      assert.equal(issues[0].message, "Published post links to a draft or scheduled post route");
      assert.equal(issues[0].target, "/posts/forthcoming/");
    }
  );
});

test("detects public posts linking to missing post routes", async () => {
  await withTempContent(
    {
      "published.md": markdown({
        title: "Published",
        body: "This links to [missing](/posts/missing-post/).",
      }),
    },
    async contentDir => {
      const posts = await loadSourcePosts({ contentDir, now: new Date("2025-01-01T00:00:00Z").getTime() });
      const issues = auditInternalPostLinks(posts);

      assert.equal(issues.length, 1);
      assert.equal(issues[0].message, "Published post links to a missing post route");
      assert.equal(issues[0].target, "/posts/missing-post/");
    }
  );
});

test("ignores links from draft posts and accepts links to published posts", async () => {
  await withTempContent(
    {
      "published.md": markdown({ title: "Published", body: "Read [other](/posts/other/)." }),
      "other.md": markdown({ title: "Other" }),
      "draft-source.md": markdown({
        title: "Draft Source",
        draft: true,
        body: "Drafts may point at [missing](/posts/missing/).",
      }),
    },
    async contentDir => {
      const posts = await loadSourcePosts({ contentDir, now: new Date("2025-01-01T00:00:00Z").getTime() });
      assert.deepEqual(auditInternalPostLinks(posts), []);
    }
  );
});

test("local audit returns error path for broken public post links", async () => {
  await withTempContent(
    {
      "published.md": markdown({
        title: "Published",
        body: "Broken [route](/posts/unpublished/).",
      }),
      "unpublished.md": markdown({
        title: "Unpublished",
        pubDatetime: "2999-01-01T00:00:00Z",
      }),
    },
    async contentDir => {
      const result = await auditLocalCrawlSurface({ contentDir, distDir: path.join(contentDir, "missing-dist") });

      assert.equal(result.mode, "local");
      assert.equal(result.issues.length, 1);
      assert.equal(result.issues[0].message, "Published post links to a draft or scheduled post route");
    }
  );
});

test("local audit reports legacy title quality as advisory without failing issues", async () => {
  await withTempContent(
    {
      "long-title.md": markdown({ title: "A".repeat(60) }),
      "duplicate-a.md": markdown({
        title: "Agentic Workflows That Ship",
        pubDatetime: "2024-01-03T00:00:00Z",
      }),
      "duplicate-b.md": markdown({
        title: "Agentic Workflows That Ship Fast",
        pubDatetime: "2024-01-04T00:00:00Z",
      }),
    },
    async contentDir => {
      const posts = await loadSourcePosts({ contentDir, now: new Date("2025-01-01T00:00:00Z").getTime() });
      const advisories = auditPublishedPostTitleQuality(posts);
      const result = await auditLocalCrawlSurface({ contentDir, distDir: path.join(contentDir, "missing-dist") });

      assert.ok(
        advisories.some(
          advisory => advisory.issue.code === "rendered_title_too_long"
        )
      );
      assert.ok(
        advisories.some(advisory => advisory.issue.code === "near_duplicate_title")
      );
      assert.equal(result.issues.length, 0);
      assert.equal(result.titleQualityAdvisories.length, advisories.length);
      assert.equal(result.checked.titleQualityAdvisories, advisories.length);
    }
  );
});

await Promise.all(pending);
console.log(`PASS ${passed} FAIL ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
