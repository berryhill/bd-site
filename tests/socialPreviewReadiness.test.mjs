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

const robotsAllowTwitterbot = `User-agent: Twitterbot
Allow: /

User-agent: *
Allow: /
Disallow: /pagefind/
Disallow: /_astro/
Disallow: /*.png$
`;

const robotsDenyTwitterbotImage = `User-agent: *
Allow: /
Disallow: /*.png$
`;

const robotsDenyTwitterbotPost = `User-agent: Twitterbot
Disallow: /posts/

User-agent: *
Allow: /
`;

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
      if (String(url) === "https://berryhill.dev/robots.txt") {
        return new Response(robotsAllowTwitterbot, {
          status: 200,
          headers: { "Content-Type": "text/plain" },
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
  assert.equal(result.robots[0].robotsUrl, "https://berryhill.dev/robots.txt");
  assert.deepEqual(
    result.robots[0].checkedPaths.map(entry => ({
      field: entry.field,
      path: entry.path,
      allowed: entry.allowed,
      group: entry.group,
      directive: entry.directive,
    })),
    [
      {
        field: "postUrl",
        path: "/posts/fresh-card-readiness/",
        allowed: true,
        group: "Twitterbot",
        directive: "Allow: /",
      },
      {
        field: "ogImage",
        path: "/posts/fresh-card-readiness/index.png",
        allowed: true,
        group: "Twitterbot",
        directive: "Allow: /",
      },
    ]
  );
  assert.deepEqual(requested.map(entry => entry.userAgent), [
    "Twitterbot/1.0",
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
      if (String(url) === "https://berryhill.dev/robots.txt") {
        return new Response(robotsAllowTwitterbot, { status: 200 });
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
      fetcher: async url => {
        if (String(url) === postUrl) {
          return new Response(validHtml(postUrl, imageUrl), { status: 200 });
        }
        if (String(url) === "https://berryhill.dev/robots.txt") {
          return new Response(robotsAllowTwitterbot, { status: 200 });
        }
        return imageResponse;
      },
    });

    assert.equal(result.ready, false, name);
    assert.match(result.issues.map(issue => issue.reason).join("\n"), pattern, name);
  }
});

test("fails closed when robots.txt denies Twitterbot access to the advertised image", async () => {
  const postUrl = "https://berryhill.dev/posts/blocked-card/";
  const imageUrl = "https://berryhill.dev/posts/blocked-card/index.png";

  const result = await waitForSocialPreviewReadiness(postUrl, {
    attempts: 1,
    fetcher: async url => {
      if (String(url) === postUrl) {
        return new Response(validHtml(postUrl, imageUrl), { status: 200 });
      }
      if (String(url) === imageUrl) {
        return new Response(makePngHeader(), {
          status: 200,
          headers: { "Content-Type": "image/png" },
        });
      }
      return new Response(robotsDenyTwitterbotImage, { status: 200 });
    },
  });

  assert.equal(result.ready, false);
  assert.equal(result.imageBytes, 33);
  assert.deepEqual(result.imageDimensions, { width: 1200, height: 630 });
  assert.equal(result.issues.some(issue => issue.stage === "robots"), true);
  assert.match(
    result.issues.map(issue => issue.reason).join("\n"),
    /robots\.txt disallows Twitterbot from \/posts\/blocked-card\/index\.png via disallow: \/\*\.png\$/i
  );
  assert.deepEqual(
    result.robots[0].checkedPaths.map(entry => [entry.field, entry.allowed, entry.group]),
    [
      ["postUrl", true, "*"],
      ["ogImage", false, "*"],
    ]
  );
});

test("fails closed when robots.txt denies Twitterbot access to the post URL", async () => {
  const postUrl = "https://berryhill.dev/posts/blocked-post/";
  const imageUrl = "https://berryhill.dev/posts/blocked-post/index.png";

  const result = await waitForSocialPreviewReadiness(postUrl, {
    attempts: 1,
    fetcher: async url => {
      if (String(url) === postUrl) {
        return new Response(validHtml(postUrl, imageUrl), { status: 200 });
      }
      if (String(url) === imageUrl) {
        return new Response(makePngHeader(), {
          status: 200,
          headers: { "Content-Type": "image/png" },
        });
      }
      return new Response(robotsDenyTwitterbotPost, { status: 200 });
    },
  });

  assert.equal(result.ready, false);
  assert.equal(result.issues.some(issue => issue.stage === "robots"), true);
  assert.match(
    result.issues.map(issue => issue.reason).join("\n"),
    /robots\.txt disallows Twitterbot from \/posts\/blocked-post\//i
  );
});

test("fails closed when robots.txt cannot be fetched", async () => {
  const postUrl = "https://berryhill.dev/posts/robots-error/";
  const imageUrl = "https://berryhill.dev/posts/robots-error/index.png";

  const result = await waitForSocialPreviewReadiness(postUrl, {
    attempts: 1,
    fetcher: async url => {
      if (String(url) === postUrl) {
        return new Response(validHtml(postUrl, imageUrl), { status: 200 });
      }
      if (String(url) === imageUrl) {
        return new Response(makePngHeader(), {
          status: 200,
          headers: { "Content-Type": "image/png" },
        });
      }
      return new Response("missing", { status: 503, statusText: "Unavailable" });
    },
  });

  assert.equal(result.ready, false);
  assert.deepEqual(result.robots[0], {
    robotsUrl: "https://berryhill.dev/robots.txt",
    userAgent: "Twitterbot",
    checkedPaths: [],
  });
  assert.match(
    result.issues.map(issue => issue.reason).join("\n"),
    /robots\.txt returned 503 Unavailable/
  );
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
