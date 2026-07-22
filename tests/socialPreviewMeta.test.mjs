/* eslint-disable no-console */
import assert from "node:assert/strict";
import {
  assertValidSocialPreviewMetadata,
  extractSocialPreviewMetadata,
  validateSocialPreviewImageReachability,
  validateSocialPreviewMetadata,
} from "../src/utils/socialPreviewMeta.ts";
import { SITE } from "../src/config.ts";

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

const validHtml = `<!doctype html>
<html>
  <head>
    <title>Agentic Workflows | berryhill.dev</title>
    <meta name="description" content="A practical note on agentic workflows." />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="berryhill.dev" />
    <meta property="og:title" content="Agentic Workflows | berryhill.dev" />
    <meta property="og:description" content="A practical note on agentic workflows." />
    <meta property="og:url" content="https://berryhill.dev/posts/agentic-workflows/" />
    <meta property="og:image" content="https://berryhill.dev/posts/agentic-workflows/index.png" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Agentic Workflows | berryhill.dev — berryhill.dev" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="https://berryhill.dev/posts/agentic-workflows/" />
    <meta name="twitter:title" content="Agentic Workflows | berryhill.dev" />
    <meta name="twitter:description" content="A practical note on agentic workflows." />
    <meta name="twitter:image" content="https://berryhill.dev/posts/agentic-workflows/index.png" />
    <meta name="twitter:image:alt" content="Agentic Workflows | berryhill.dev — berryhill.dev" />
  </head>
</html>`;

const homepageHtml = `<!doctype html>
<html>
  <head>
    <title>${SITE.title}</title>
    <meta name="description" content="${SITE.desc}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${SITE.title}" />
    <meta property="og:title" content="${SITE.socialPreview.title}" />
    <meta property="og:description" content="${SITE.desc}" />
    <meta property="og:url" content="https://berryhill.dev/" />
    <meta property="og:image" content="https://berryhill.dev/og.png?v=${SITE.socialPreview.imageVersion}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${SITE.socialPreview.imageAlt}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="https://berryhill.dev/" />
    <meta name="twitter:title" content="${SITE.socialPreview.title}" />
    <meta name="twitter:description" content="${SITE.desc}" />
    <meta name="twitter:image" content="https://berryhill.dev/og.png?v=${SITE.socialPreview.imageVersion}" />
    <meta name="twitter:image:alt" content="${SITE.socialPreview.imageAlt}" />
  </head>
</html>`;

test("extracts required social preview metadata", () => {
  assert.deepEqual(extractSocialPreviewMetadata(validHtml), {
    title: "Agentic Workflows | berryhill.dev",
    description: "A practical note on agentic workflows.",
    ogType: "article",
    ogSiteName: "berryhill.dev",
    ogTitle: "Agentic Workflows | berryhill.dev",
    ogDescription: "A practical note on agentic workflows.",
    ogUrl: "https://berryhill.dev/posts/agentic-workflows/",
    ogImage: "https://berryhill.dev/posts/agentic-workflows/index.png",
    ogImageType: "image/png",
    ogImageWidth: "1200",
    ogImageHeight: "630",
    ogImageAlt: "Agentic Workflows | berryhill.dev — berryhill.dev",
    twitterCard: "summary_large_image",
    twitterUrl: "https://berryhill.dev/posts/agentic-workflows/",
    twitterTitle: "Agentic Workflows | berryhill.dev",
    twitterDescription: "A practical note on agentic workflows.",
    twitterImage: "https://berryhill.dev/posts/agentic-workflows/index.png",
    twitterImageAlt: "Agentic Workflows | berryhill.dev — berryhill.dev",
  });
});

test("accepts complete matching social preview metadata", () => {
  const result = validateSocialPreviewMetadata(validHtml);

  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
  assert.doesNotThrow(() => assertValidSocialPreviewMetadata(validHtml));
});

test("accepts homepage social title that intentionally differs from document title", () => {
  const result = validateSocialPreviewMetadata(homepageHtml);
  const metadata = result.metadata;

  assert.equal(result.valid, true);
  assert.equal(metadata.ogSiteName, SITE.title);
  assert.equal(metadata.ogTitle, SITE.socialPreview.title);
  assert.equal(metadata.ogUrl, "https://berryhill.dev/");
  assert.equal(metadata.twitterUrl, metadata.ogUrl);
  assert.notEqual(metadata.ogTitle, metadata.ogSiteName);
  assert.notEqual(metadata.ogTitle, metadata.title);
  assert.equal(metadata.ogImageType, "image/png");
  assert.equal(metadata.ogImageWidth, "1200");
  assert.equal(metadata.ogImageHeight, "630");
  assert.equal(metadata.ogImageAlt, SITE.socialPreview.imageAlt);
  assert.equal(metadata.twitterImageAlt, SITE.socialPreview.imageAlt);
  assert.equal(
    metadata.ogImage,
    `https://berryhill.dev/og.png?v=${SITE.socialPreview.imageVersion}`
  );
  assert.equal(metadata.twitterImage, metadata.ogImage);
});

test("decodes HTML entities in title and meta content", () => {
  const html = validHtml
    .replaceAll("Agentic Workflows", "Agents &amp; Operators")
    .replaceAll("practical note", "operator&#x27;s note");
  const result = validateSocialPreviewMetadata(html);

  assert.equal(result.valid, true);
  assert.equal(result.metadata.title, "Agents & Operators | berryhill.dev");
  assert.equal(
    result.metadata.description,
    "A operator's note on agentic workflows."
  );
});

test("rejects missing required tags", () => {
  const html = `<!doctype html><title>Post</title><meta property="og:image" content="/og.png" />`;
  const result = validateSocialPreviewMetadata(html);

  assert.equal(result.valid, false);
  assert.match(
    result.issues.map(issue => issue.field).join(","),
    /description/
  );
  assert.throws(
    () => assertValidSocialPreviewMetadata(html),
    /Invalid social preview metadata/
  );
});

test("rejects mismatched title, description, image, alt text, dimensions, and card type", () => {
  const html = validHtml
    .replace('content="Agentic Workflows | berryhill.dev"', 'content="Wrong OG"')
    .replace(
      'content="A practical note on agentic workflows." />\n    <meta name="twitter:image"',
      'content="Wrong Twitter description" />\n    <meta name="twitter:image"'
    )
    .replace("summary_large_image", "summary")
    .replace(
      'content="https://berryhill.dev/posts/agentic-workflows/" />\n    <meta property="og:image"',
      'content="https://example.com/wrong/" />\n    <meta property="og:image"'
    )
    .replace('content="image/png"', 'content="text/html"')
    .replace('content="1200"', 'content="600"')
    .replace('content="630"', 'content="315"')
    .replace(
      'content="Agentic Workflows | berryhill.dev — berryhill.dev" />\n    <meta name="twitter:card"',
      'content="Wrong alt" />\n    <meta name="twitter:card"'
    )
    .replace(
      "https://berryhill.dev/posts/agentic-workflows/index.png\" />\n    <meta property=\"og:image:type",
      "https://berryhill.dev/posts/agentic-workflows/custom.png\" />\n    <meta property=\"og:image:type"
    );
  const result = validateSocialPreviewMetadata(html);
  const reasons = result.issues.map(issue => issue.reason).join("\n");

  assert.equal(result.valid, false);
  assert.match(reasons, /Title, og:title, and twitter:title should match/);
  assert.match(reasons, /Twitter card should be/);
  assert.match(reasons, /description should match/);
  assert.match(reasons, /og:url and twitter:url should match/);
  assert.match(reasons, /og:image and twitter:image should match/);
  assert.match(reasons, /og:image:type should be image\/png/);
  assert.match(reasons, /og:image:width should be 1200/);
  assert.match(reasons, /og:image:height should be 630/);
  assert.match(reasons, /og:image:alt and twitter:image:alt should match/);
});

test("rejects Twitter tags emitted with property instead of name", () => {
  const html = validHtml
    .replaceAll('<meta name="twitter:', '<meta property="twitter:')
    .replaceAll(' />', ' />');
  const result = validateSocialPreviewMetadata(html);

  assert.equal(result.valid, false);
  assert.match(
    result.issues.map(issue => issue.reason).join("\n"),
    /Twitter metadata should use name=/
  );
});

test("validates that advertised social preview images are reachable images", async () => {
  const metadata = extractSocialPreviewMetadata(validHtml);
  const requested = [];
  const result = await validateSocialPreviewImageReachability(
    metadata,
    async (url, init) => {
      requested.push({ url: String(url), userAgent: init?.headers?.["User-Agent"] });
      return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "Content-Type": "image/png" },
      });
    }
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
  assert.equal(requested.length, 1);
  assert.equal(requested[0].url, "https://berryhill.dev/posts/agentic-workflows/index.png");
  assert.equal(requested[0].userAgent, "Twitterbot/1.0");
});

test("rejects unreachable or non-image advertised social preview images", async () => {
  const metadata = {
    ...extractSocialPreviewMetadata(validHtml),
    twitterImage: "https://berryhill.dev/posts/agentic-workflows/not-image.txt",
  };
  const result = await validateSocialPreviewImageReachability(
    metadata,
    async url => {
      if (String(url).endsWith("index.png")) {
        return new Response(null, { status: 404, statusText: "Not Found" });
      }

      return new Response("not an image", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }
  );

  assert.equal(result.valid, false);
  assert.deepEqual(
    result.issues.map(issue => issue.field),
    ["ogImage", "twitterImage"]
  );
  assert.match(
    result.issues.map(issue => issue.reason).join("\n"),
    /Image URL returned 404 Not Found/
  );
  assert.match(
    result.issues.map(issue => issue.reason).join("\n"),
    /non-image content type text\/plain/
  );
});

for (const maybePromise of pending) {
  await maybePromise;
}

console.log(`PASS ${passed} FAIL ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
