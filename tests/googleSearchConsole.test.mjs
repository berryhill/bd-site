/* eslint-disable no-console */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { submitSitemapToGoogleSearchConsole } from "../src/utils/googleSearchConsole.ts";

let passed = 0;
let failed = 0;

async function run() {
  const tests = [];
  const add = (name, fn) => {
    tests.push([name, fn]);
  };

  add("Google Search Console submission skips cleanly when bearer token is missing", async () => {
    const originalToken = process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN;
    const originalFetch = globalThis.fetch;
    delete process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN;
    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      return new Response(null, { status: 204 });
    };

    try {
      const result = await submitSitemapToGoogleSearchConsole();
      assert.deepEqual(result, {
        ok: false,
        skipped: true,
        reason: "missing_config: GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN",
      });
      assert.equal(fetchCalled, false);
    } finally {
      if (originalToken === undefined) {
        delete process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN;
      } else {
        process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN = originalToken;
      }
      globalThis.fetch = originalFetch;
    }
  });

  add("Google Search Console submission uses supported sitemap endpoint with server bearer token", async () => {
    const originalFetch = globalThis.fetch;
    let requestUrl = "";
    let requestInit;
    globalThis.fetch = async (url, init) => {
      requestUrl = String(url);
      requestInit = init;
      return new Response(null, { status: 204 });
    };

    try {
      const result = await submitSitemapToGoogleSearchConsole({
        accessToken: "test-token",
        siteUrl: "https://berryhill.dev/",
        sitemapUrl: "https://berryhill.dev/sitemap.xml",
      });

      assert.deepEqual(result, { ok: true, status: 204 });
      assert.equal(requestInit.method, "PUT");
      assert.equal(requestInit.headers.Authorization, "Bearer test-token");
      assert.match(
        requestUrl,
        /^https:\/\/www\.googleapis\.com\/webmasters\/v3\/sites\//
      );
      assert.match(requestUrl, /sitemaps\//);
      assert.doesNotMatch(requestUrl, /indexing\/v3/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  add("Google Search Console API failure is observable and non-throwing", async () => {
    const originalFetch = globalThis.fetch;
    const originalWarn = console.warn;
    let warned = false;
    globalThis.fetch = async () => new Response("nope", { status: 403 });
    console.warn = () => {
      warned = true;
    };

    try {
      const result = await submitSitemapToGoogleSearchConsole({
        accessToken: "test-token",
      });

      assert.deepEqual(result, { ok: false, status: 403 });
      assert.equal(warned, true);
    } finally {
      globalThis.fetch = originalFetch;
      console.warn = originalWarn;
    }
  });

  add("public post crawl utility attempts IndexNow, Google, and Yahoo but skips drafts", () => {
    const source = readFileSync(
      new URL("../src/utils/publicPostCrawlSignals.ts", import.meta.url),
      "utf8"
    );

    assert.match(source, /if \(options\?\.isDraft\) \{/);
    assert.match(source, /reason: "draft"/);
    assert.match(source, /Promise\.all\(\[/);
    assert.match(source, /submitIndexNow\(postUrl\)/);
    assert.match(source, /submitGoogleSitemap\(\)/);
    assert.match(source, /submitYahoo\(postUrl, \{ indexNowResult: indexNow \}\)/);
  });

  add("posts API only emits public crawl signals inside non-draft create/update branches", () => {
    const source = readFileSync(
      new URL("../src/pages/api/posts.ts", import.meta.url),
      "utf8"
    );

    assert.match(source, /const crawlSignals = !draft[\s\S]*?submitPublicPostCrawlSignals\(`\$\{SITE\.website\}posts\/\$\{slug\}\/`\)[\s\S]*?: undefined;/);
    assert.match(source, /const isDraft = draft !== undefined \? draft : frontmatterData\.draft;[\s\S]*?const crawlSignals = !isDraft[\s\S]*?submitPublicPostCrawlSignals\(`\$\{SITE\.website\}posts\/\$\{slug\}\/`\)[\s\S]*?: undefined;/);
  });

  for (const [name, fn] of tests) {
    try {
      await fn();
      passed += 1;
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${name}`);
      console.error(error);
    }
  }

  console.log(`PASS ${passed} FAIL ${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

await run();
