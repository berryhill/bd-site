/* eslint-disable no-console */
import assert from "node:assert/strict";
import {
  assertValidSocialPreviewMetadata,
  extractSocialPreviewMetadata,
  validateSocialPreviewMetadata,
} from "../src/utils/socialPreviewMeta.ts";

let passed = 0;
let failed = 0;

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

const validHtml = `<!doctype html>
<html>
  <head>
    <title>Agentic Workflows | berryhill.dev</title>
    <meta name="description" content="A practical note on agentic workflows." />
    <meta property="og:title" content="Agentic Workflows | berryhill.dev" />
    <meta property="og:description" content="A practical note on agentic workflows." />
    <meta property="og:image" content="https://berryhill.dev/posts/agentic-workflows/index.png" />
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:title" content="Agentic Workflows | berryhill.dev" />
    <meta property="twitter:description" content="A practical note on agentic workflows." />
    <meta property="twitter:image" content="https://berryhill.dev/posts/agentic-workflows/index.png" />
  </head>
</html>`;

test("extracts required social preview metadata", () => {
  assert.deepEqual(extractSocialPreviewMetadata(validHtml), {
    title: "Agentic Workflows | berryhill.dev",
    description: "A practical note on agentic workflows.",
    ogTitle: "Agentic Workflows | berryhill.dev",
    ogDescription: "A practical note on agentic workflows.",
    ogImage: "https://berryhill.dev/posts/agentic-workflows/index.png",
    twitterCard: "summary_large_image",
    twitterTitle: "Agentic Workflows | berryhill.dev",
    twitterDescription: "A practical note on agentic workflows.",
    twitterImage: "https://berryhill.dev/posts/agentic-workflows/index.png",
  });
});

test("accepts complete matching social preview metadata", () => {
  const result = validateSocialPreviewMetadata(validHtml);

  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
  assert.doesNotThrow(() => assertValidSocialPreviewMetadata(validHtml));
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

test("rejects mismatched title, description, image, and card type", () => {
  const html = validHtml
    .replace('content="Agentic Workflows | berryhill.dev"', 'content="Wrong OG"')
    .replace(
      'content="A practical note on agentic workflows." />\n    <meta property="twitter:image"',
      'content="Wrong Twitter description" />\n    <meta property="twitter:image"'
    )
    .replace("summary_large_image", "summary")
    .replace(
      "https://berryhill.dev/posts/agentic-workflows/index.png\" />\n    <meta property=\"twitter:card",
      "https://berryhill.dev/posts/agentic-workflows/custom.png\" />\n    <meta property=\"twitter:card"
    );
  const result = validateSocialPreviewMetadata(html);

  assert.equal(result.valid, false);
  assert.match(
    result.issues.map(issue => issue.reason).join("\n"),
    /Title, og:title, and twitter:title should match/
  );
  assert.match(
    result.issues.map(issue => issue.reason).join("\n"),
    /Twitter card should be/
  );
  assert.match(
    result.issues.map(issue => issue.reason).join("\n"),
    /description should match/
  );
  assert.match(
    result.issues.map(issue => issue.reason).join("\n"),
    /og:image and twitter:image should match/
  );
});

console.log(`PASS ${passed} FAIL ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
