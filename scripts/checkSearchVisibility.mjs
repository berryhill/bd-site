#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * scripts/checkSearchVisibility.mjs
 *
 * Verifies crawler/AI-agent discoverability surfaces for berryhill.dev:
 *   - robots.txt       (sitemap reference, AI-crawler directives)
 *   - sitemap.xml      (index)
 *   - rss.xml          (feed)
 *   - llms.txt         (LLM manifest, requires PR #35 deployed)
 *   - representative post JSON-LD schema
 *
 * Usage:
 *   pnpm run check:search-visibility
 *   pnpm run check:search-visibility -- https://berryhill.dev
 *
 * Exit codes:
 *   0  - all checks pass
 *   1  - one or more checks fail
 *   2  - unexpected error (network, etc.)
 */

// Uses native fetch (Node 18+); no external dependency required.

const BASE = process.argv.find((a) => /^https?:\/\//i.test(a)) ?? "https://berryhill.dev";

const CHECKS = [
  {
    name: "robots.txt",
    path: "/robots.txt",
    status: 200,
    assert(text) {
      return (
        text.includes("Sitemap:") ||
        text.includes("sitemap") ||
        text.includes("Allow:") ||
        text.includes("Disallow:")
      );
    },
    assertLabel: "Sitemap: directive or allow/disallow rules present",
  },
  {
    name: "sitemap-index",
    path: "/sitemap-index.xml",
    status: 200,
    assert(text) {
      return text.includes("sitemap");
    },
    assertLabel: "sitemap XML structure present",
  },
  {
    name: "rss.xml",
    path: "/rss.xml",
    status: 200,
    assert(text) {
      return text.includes("<rss") || text.includes("<channel>");
    },
    assertLabel: "RSS 2.0 structure present",
  },
  {
    name: "llms.txt",
    path: "/llms.txt",
    status: 200,
    contentType: "text/plain",
    assert(text) {
      return (
        text.includes("#") &&
        (text.includes("Sitemap") || text.includes("sitemap")) &&
        (text.includes("RSS") || text.includes("rss"))
      );
    },
    assertLabel: "llms.txt manifest with title + sitemap + RSS references",
  },
  {
    name: "post JSON-LD schema",
    path: "/posts/quantum-is-coming-agent-workflows-should-start-leaving-breadcrumbs/",
    status: 200,
    assert(text) {
      return text.includes('application/ld+json') || text.includes('"@type"');
    },
    assertLabel: "JSON-LD structured data present",
    optional: true,
  },
];

const PAGEFIND_NOTE =
  "NOTE: Pagefind requires a static-site build output (public/pagefind/). " +
  "With SSR/standalone-node mode, Pagefind indexing runs post-build in CI. " +
  "Verify: curl -s https://berryhill.dev/search | grep pagefind";

async function run() {
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  console.log(`Checking search visibility surfaces at: ${BASE}\n`);

  for (const check of CHECKS) {
    const url = new URL(check.path, BASE).href;
    let ok = false;
    let reason = "";

    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: { "User-Agent": "berryhill-dev-visibility-check/1.0" },
      });

      if (res.status !== check.status) {
        reason = `HTTP ${res.status} (expected ${check.status})`;
      } else {
        const text = await res.text();

        if (check.contentType) {
          const ct = res.headers.get("content-type") ?? "";
          if (!ct.includes(check.contentType.replace(/;.*/, ""))) {
            reason = `Content-Type ${ct} does not match ${check.contentType}`;
          }
        }

        if (!reason && !check.assert(text)) {
          reason = `Assertion failed: ${check.assertLabel}`;
        }

        if (!reason) {
          ok = true;
        }
      }
    } catch (err) {
      reason = err instanceof Error ? err.message : String(err);
    }

    if (ok) {
      passed++;
      console.log(`  PASS  ${check.name.padEnd(25)} ${check.path}`);
    } else if (check.optional) {
      skipped++;
      console.log(`  WARN  ${check.name.padEnd(25)} ${check.path}  (optional: ${reason})`);
    } else {
      failed++;
      console.error(`  FAIL  ${check.name.padEnd(25)} ${check.path}  ${reason}`);
    }
  }

  console.log(`\n${PAGEFIND_NOTE}\n`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);

  if (failed > 0) {
    process.exitCode = 1;
  } else if (passed === 0) {
    console.error("No checks passed — network or base URL issue?");
    process.exitCode = 2;
  }
}

run().catch((err) => {
  console.error("Unexpected error:", err instanceof Error ? err.message : err);
  process.exitCode = 2;
});
