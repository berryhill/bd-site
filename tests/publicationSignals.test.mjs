/* eslint-disable no-console */
import assert from 'node:assert/strict';
import { postPublicationSignals } from '../src/utils/postPublicationSignals.ts';
import { submitPublicPostCrawlSignals } from '../src/utils/publicPostCrawlSignals.ts';
import { submitSitemapToGoogleSearchConsole } from '../src/utils/googleSearchConsole.ts';

const saved = Object.fromEntries(['GOOGLE_APPLICATION_CREDENTIALS', 'GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN'].map(k => [k, process.env[k]]));
const originalWarn = console.warn;
const originalFetch = globalThis.fetch;
let warnings = 0;
try {
  for (const k of Object.keys(saved)) delete process.env[k];
  console.warn = () => warnings++;
  globalThis.fetch = () => { throw new Error('Missing configuration must not use network'); };
  const missing = await submitSitemapToGoogleSearchConsole();
  assert.equal(missing.ok, false); assert.equal(missing.skipped, true); assert.equal(warnings, 1);
  const aggregate = await submitPublicPostCrawlSignals('https://example.test/posts/fixture/', { deps: {
    submitIndexNow: async () => true,
    submitGoogleSitemap: async () => missing,
    submitDuckDuckGo: async () => ({ ok: true }),
    submitYahoo: async () => ({ ok: true }),
  } });
  assert.equal(aggregate.ok, false); assert.equal(aggregate.google, missing);
  for (const social of [async () => ({ ready: false }), async () => { throw new Error('preview unavailable'); }, () => { throw new Error('synchronous preview failure'); }]) {
    let crawls = 0;
    const deps = { social, crawl: async () => { crawls++; return aggregate; } };
    const result = await postPublicationSignals('https://example.test/posts/fixture/', { pubDatetime: '2020-01-01', draft: false }, deps);
    assert.equal(crawls, 1); assert.equal(result.crawlSignals, aggregate);
    await postPublicationSignals('https://example.test/posts/fixture/', { pubDatetime: '2020-01-01', draft: true }, deps);
    await postPublicationSignals('https://example.test/posts/fixture/', { pubDatetime: '2099-01-01', draft: false }, deps);
    assert.equal(crawls, 1);
  }
  console.log('Publication signal behavioral regressions passed');
} finally {
  console.warn = originalWarn; globalThis.fetch = originalFetch;
  for (const [k,v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
}
