/* eslint-disable no-console */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { submitDuckDuckGoCrawlSignal } from "../src/utils/duckDuckGoCrawlSignal.ts";

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(error);
  }
}

await test("DuckDuckGo signal reports indirect Bing/IndexNow coverage without a direct endpoint", async () => {
  const result = await submitDuckDuckGoCrawlSignal(
    "https://berryhill.dev/posts/example-post/",
    {
      indexNowSubmitted: true,
    }
  );

  assert.equal(result.provider, "duckduckgo");
  assert.equal(result.ok, true);
  assert.equal(result.mode, "covered_by_bing_indexnow");
  assert.equal(result.indexNowSubmitted, true);
  assert.equal(result.duckDuckBotAllowed, true);
  assert.equal(result.sitemapUrl, "https://berryhill.dev/sitemap.xml");
  assert.match(result.reason, /no documented direct URL submission endpoint/);
  assert.deepEqual(result.sources, [
    "https://duckduckgo.com/duckduckgo-help-pages/results/sources",
    "https://www.indexnow.org/",
  ]);
});

await test("DuckDuckGo signal falls back to sitemap and DuckDuckBot when IndexNow is unavailable", async () => {
  const result = await submitDuckDuckGoCrawlSignal(
    "https://berryhill.dev/posts/example-post/",
    {
      indexNowSubmitted: false,
    }
  );

  assert.equal(result.ok, true);
  assert.equal(result.mode, "sitemap_and_crawler");
  assert.equal(result.indexNowSubmitted, false);
  assert.equal(result.duckDuckBotAllowed, true);
});

await test("DuckDuckGo signal skips cleanly when explicitly disabled", async () => {
  const result = await submitDuckDuckGoCrawlSignal(
    "https://berryhill.dev/posts/example-post/",
    {
      disabled: true,
      indexNowSubmitted: true,
    }
  );

  assert.equal(result.provider, "duckduckgo");
  assert.equal(result.ok, false);
  assert.equal(result.mode, "skipped");
  assert.equal(result.indexNowSubmitted, true);
  assert.equal(result.duckDuckBotAllowed, true);
  assert.equal(result.sitemapUrl, undefined);
  assert.equal(result.reason, "disabled: DUCKDUCKGO_CRAWL_SIGNAL_DISABLED");
});

await test("DuckDuckGo signal honors disabled environment config without fetching", async () => {
  const originalDisabled = process.env.DUCKDUCKGO_CRAWL_SIGNAL_DISABLED;
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return new Response(null, { status: 204 });
  };
  process.env.DUCKDUCKGO_CRAWL_SIGNAL_DISABLED = "true";

  try {
    const result = await submitDuckDuckGoCrawlSignal(
      "https://berryhill.dev/posts/example-post/"
    );

    assert.equal(result.ok, false);
    assert.equal(result.mode, "skipped");
    assert.equal(result.reason, "disabled: DUCKDUCKGO_CRAWL_SIGNAL_DISABLED");
    assert.equal(fetchCalled, false);
  } finally {
    if (originalDisabled === undefined) {
      delete process.env.DUCKDUCKGO_CRAWL_SIGNAL_DISABLED;
    } else {
      process.env.DUCKDUCKGO_CRAWL_SIGNAL_DISABLED = originalDisabled;
    }
    globalThis.fetch = originalFetch;
  }
});

await test("DuckDuckGo signal errors are observable and non-throwing", async () => {
  const originalWarn = console.warn;
  let warned = false;
  console.warn = () => {
    warned = true;
  };

  try {
    const result = await submitDuckDuckGoCrawlSignal("not a url");

    assert.equal(result.provider, "duckduckgo");
    assert.equal(result.ok, false);
    assert.equal(result.mode, "skipped");
    assert.equal(result.duckDuckBotAllowed, true);
    assert.match(result.reason, /Invalid URL/);
    assert.equal(warned, true);
  } finally {
    console.warn = originalWarn;
  }
});

await test("public post crawl utility wires DuckDuckGo after IndexNow and skips drafts", () => {
  const source = readFileSync(
    new URL("../src/utils/publicPostCrawlSignals.ts", import.meta.url),
    "utf8"
  );

  assert.match(source, /submitDuckDuckGo\(postUrl, \{\s*indexNowSubmitted: indexNow,\s*\}\)/);
  assert.match(source, /if \(options\?\.isDraft\) \{/);
  assert.match(source, /reason: "draft"/);
  assert.ok(
    source.indexOf("if (options?.isDraft) {") <
      source.indexOf("const submitDuckDuckGo =")
  );
});

await test("DuckDuckGo implementation does not invent a direct DuckDuckGo submit endpoint", () => {
  const source = readFileSync(
    new URL("../src/utils/duckDuckGoCrawlSignal.ts", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(source, /fetch\(/);
  assert.doesNotMatch(source, /duckduckgo\.com\/.*submit/i);
});

console.log(`PASS ${passed} FAIL ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
