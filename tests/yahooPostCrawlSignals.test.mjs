/* eslint-disable no-console */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

let passed = 0;
let failed = 0;

const publicSignalsSource = readFileSync(
  new URL("../src/utils/publicPostCrawlSignals.ts", import.meta.url),
  "utf8"
);
const yahooSignalsSource = readFileSync(
  new URL("../src/utils/yahooPostCrawlSignals.ts", import.meta.url),
  "utf8"
);
const postsApiSource = readFileSync(
  new URL("../src/pages/api/posts.ts", import.meta.url),
  "utf8"
);

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

test("public post crawl signals include Yahoo-specific evidence via Bing IndexNow", () => {
  assert.match(publicSignalsSource, /import \{ submitYahooPostCrawlSignal \} from "\.\/yahooPostCrawlSignals"/);
  assert.match(publicSignalsSource, /const yahoo = await submitYahoo\(postUrl, \{ indexNowResult: indexNow \}\);/);
  assert.match(publicSignalsSource, /yahoo,/);
  assert.match(yahooSignalsSource, /searchEngine: "yahoo"/);
  assert.match(yahooSignalsSource, /via: "bing_webmaster_tools_indexnow"/);
  assert.match(yahooSignalsSource, /crawler: "Yahoo Slurp"/);
  assert.match(yahooSignalsSource, /endpoint: "https:\/\/www\.bing\.com\/indexnow"/);
  assert.match(yahooSignalsSource, /guaranteedIndexing: false/);
});

test("draft posts skip Yahoo signal without calling IndexNow", () => {
  assert.match(publicSignalsSource, /if \(options\?\.isDraft\) \{[\s\S]*?submitYahoo\(postUrl, \{ isDraft: true \}\)[\s\S]*?skipped: true[\s\S]*?reason: "draft"/);
  assert.match(yahooSignalsSource, /if \(options\?\.isDraft\) \{[\s\S]*?skipped: true[\s\S]*?reason: "draft"[\s\S]*?\};[\s\S]*?\}/);
  assert.doesNotMatch(
    yahooSignalsSource.match(/if \(options\?\.isDraft\) \{[\s\S]*?\n  \}/)?.[0] ?? "",
    /submitToIndexNow|submitIndexNow\(postUrl\)/
  );
});

test("Yahoo signal unavailable path is observable and non-throwing", () => {
  assert.match(yahooSignalsSource, /catch \(error\) \{/);
  assert.match(yahooSignalsSource, /ok: false/);
  assert.match(yahooSignalsSource, /reason: error instanceof Error \? error\.message : "unknown_error"/);
  assert.match(yahooSignalsSource, /indexNowSubmitted: false/);
  assert.match(publicSignalsSource, /catch \(error\) \{/);
});

test("posts API returns crawl signal evidence only in non-draft create/update branches", () => {
  assert.match(postsApiSource, /const socialPreviewReadiness = !draft[\s\S]*?verifyPublicPostShareReadiness\(slug\)[\s\S]*?: undefined;/);
  assert.match(postsApiSource, /const socialPreviewReadiness = !isDraft[\s\S]*?verifyPublicPostShareReadiness\(slug\)[\s\S]*?: undefined;/);
  assert.match(postsApiSource, /const crawlSignals = socialPreviewReadiness\?\.ready[\s\S]*?submitPublicPostCrawlSignals\(publicPostUrl\(slug\)\)[\s\S]*?: undefined;/);
  assert.match(postsApiSource, /crawlSignals,/);
});

test("Yahoo path avoids fake standalone Yahoo endpoint or indexing guarantee", () => {
  assert.doesNotMatch(yahooSignalsSource, /yahoo\.com\/indexnow/i);
  assert.doesNotMatch(yahooSignalsSource, /search\.yahooapis/i);
  assert.doesNotMatch(yahooSignalsSource, /guaranteedIndexing: true/);
});

console.log(`PASS ${passed} FAIL ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
