/* eslint-disable no-console */
import assert from "node:assert/strict";
import { waitForSocialPreviewReadiness } from "../src/utils/socialPreviewReadiness.ts";

let passed = 0;
let failed = 0;
const pending = [];

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === "function") {
      pending.push(
        result
          .then(() => {
            passed += 1;
          })
          .catch(error => {
            failed += 1;
            console.error(`FAIL ${name}`);
            console.error(error);
          })
      );
      return;
    }
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(error);
  }
}

function makePngHeader(width = 1200, height = 630) {
  const png = new Uint8Array(33);
  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  png.set([0x00, 0x00, 0x00, 0x0d], 8);
  png.set([0x49, 0x48, 0x44, 0x52], 12);
  const view = new DataView(png.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  png.set([0x08, 0x06, 0x00, 0x00, 0x00], 24);
  return png;
}

function validHtml(postUrl, imageUrl) {
  return `<!doctype html>
<html>
  <head>
    <title>Fresh Card Readiness | berryhill.dev</title>
    <meta name="description" content="A fresh public post social card readiness check." />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="berryhill.dev" />
    <meta property="og:title" content="Fresh Card Readiness | berryhill.dev" />
    <meta property="og:description" content="A fresh public post social card readiness check." />
    <meta property="og:url" content="${postUrl}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Fresh Card Readiness | berryhill.dev — berryhill.dev" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${postUrl}" />
    <meta name="twitter:title" content="Fresh Card Readiness | berryhill.dev" />
    <meta name="twitter:description" content="A fresh public post social card readiness check." />
    <meta name="twitter:image" content="${imageUrl}" />
    <meta name="twitter:image:alt" content="Fresh Card Readiness | berryhill.dev — berryhill.dev" />
  </head>
</html>`;
}

test("accepts a ready fresh post with matching metadata and 1200x630 PNG", async () => {
  const postUrl = "https://berryhill.dev/posts/fresh-card-readiness/";
  const imageUrl = "https://berryhill.dev/posts/fresh-card-readiness/index.png";
  const requested = [];

  const result = await waitForSocialPreviewReadiness(postUrl, {
    attempts: 1,
    fetcher: async (url, init) => {
      requested.push({ url: String(url), userAgent: init?.headers?.["User-Agent"] });
      if (String(url) === postUrl) {
        return new Response(validHtml(postUrl, imageUrl), {
          status: 200,
          headers: { "Content-Type": "text/html" },
        });
      }
      return new Response(makePngHeader(), {
        status: 200,
        headers: { "Content-Type": "image/png" },
      });
    },
  });

  assert.equal(result.ready, true);
  assert.equal(result.attempts, 1);
  assert.equal(result.imageUrl, imageUrl);
  assert.equal(result.imageBytes, 33);
  assert.deepEqual(result.imageDimensions, { width: 1200, height: 630 });
  assert.deepEqual(result.issues, []);
  assert.deepEqual(requested.map(entry => entry.userAgent), [
    "Twitterbot/1.0",
    "Twitterbot/1.0",
  ]);
});

test("polls through a transient fresh-publication miss before reporting ready", async () => {
  const postUrl = "https://berryhill.dev/posts/transition-post/";
  const imageUrl = "https://berryhill.dev/posts/transition-post/index.png";
  let imageRequests = 0;

  const result = await waitForSocialPreviewReadiness(postUrl, {
    attempts: 3,
    intervalMs: 0,
    fetcher: async url => {
      if (String(url) === postUrl) {
        return new Response(validHtml(postUrl, imageUrl), { status: 200 });
      }
      imageRequests += 1;
      if (imageRequests === 1) {
        return new Response(null, { status: 404, statusText: "Not Found" });
      }
      return new Response(makePngHeader(), {
        status: 200,
        headers: { "Content-Type": "image/png" },
      });
    },
  });

  assert.equal(result.ready, true);
  assert.equal(result.attempts, 2);
  assert.equal(imageRequests, 2);
});

test("rejects non-PNG, empty, and wrong-size image responses with evidence", async () => {
  const postUrl = "https://berryhill.dev/posts/bad-image/";
  const imageUrl = "https://berryhill.dev/posts/bad-image/index.png";

  for (const [name, imageResponse, pattern] of [
    [
      "non-png",
      new Response("not an image", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      }),
      /non-PNG content type text\/plain/,
    ],
    [
      "empty",
      new Response(new Uint8Array(), {
        status: 200,
        headers: { "Content-Type": "image/png" },
      }),
      /too small/,
    ],
    [
      "wrong-size",
      new Response(makePngHeader(600, 315), {
        status: 200,
        headers: { "Content-Type": "image/png" },
      }),
      /600×315.*1200×630/,
    ],
  ]) {
    const result = await waitForSocialPreviewReadiness(postUrl, {
      attempts: 1,
      fetcher: async url =>
        String(url) === postUrl
          ? new Response(validHtml(postUrl, imageUrl), { status: 200 })
          : imageResponse,
    });

    assert.equal(result.ready, false, name);
    assert.match(result.issues.map(issue => issue.reason).join("\n"), pattern, name);
  }
});

test("returns structured timeout evidence when HTML metadata never becomes valid", async () => {
  const postUrl = "https://berryhill.dev/posts/not-ready-yet/";

  const result = await waitForSocialPreviewReadiness(postUrl, {
    attempts: 2,
    intervalMs: 0,
    fetcher: async () =>
      new Response("<!doctype html><title>Not ready</title>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }),
  });

  assert.equal(result.ready, false);
  assert.equal(result.attempts, 2);
  assert.equal(result.postUrl, postUrl);
  assert.equal(result.issues.some(issue => issue.stage === "metadata"), true);
  assert.match(
    result.issues.map(issue => issue.reason).join("\n"),
    /Required social preview metadata is missing/
  );
});

for (const maybePromise of pending) {
  await maybePromise;
}

console.log(`PASS ${passed} FAIL ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
