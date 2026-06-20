/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  assertValidBlogVisualAssets,
  extractBlogImageReferences,
  extractBlogImageSources,
  isInlineImageDataUri,
  validateBlogVisualAssets,
} from "../src/utils/blogVisualAssets.ts";

function createPublicDirWithAsset(postSlug = "durable-post") {
  const publicDir = fs.mkdtempSync(path.join(os.tmpdir(), "bd-blog-assets-"));
  const assetDir = path.join(publicDir, "assets", "blog", postSlug);
  fs.mkdirSync(assetDir, { recursive: true });
  fs.writeFileSync(
    path.join(assetDir, "pipeline.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>'
  );
  return publicDir;
}

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

test("extracts Markdown and HTML image references with alt and caption metadata", () => {
  const markdown = [
    '![Pipeline diagram](/assets/blog/durable-post/pipeline.svg "Build gate diagram")',
    '<img src="/assets/blog/durable-post/pipeline.svg" alt="Pipeline diagram" title="Build gate diagram" />',
  ].join("\n");

  assert.deepEqual(extractBlogImageSources(markdown), [
    "/assets/blog/durable-post/pipeline.svg",
  ]);
  assert.deepEqual(extractBlogImageReferences(markdown), [
    {
      src: "/assets/blog/durable-post/pipeline.svg",
      altText: "Pipeline diagram",
      caption: "Build gate diagram",
      source: "markdown",
    },
    {
      src: "/assets/blog/durable-post/pipeline.svg",
      altText: "Pipeline diagram",
      caption: "Build gate diagram",
      source: "html",
    },
  ]);
});

test("accepts durable blog visual assets stored under public/assets/blog/<post-slug>", () => {
  const publicDir = createPublicDirWithAsset();
  const markdown =
    '![Pipeline diagram](/assets/blog/durable-post/pipeline.svg "Build gate diagram")';

  const result = validateBlogVisualAssets(markdown, {
    postSlug: "durable-post",
    publicDir,
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
  assert.doesNotThrow(() =>
    assertValidBlogVisualAssets(markdown, {
      postSlug: "durable-post",
      publicDir,
    })
  );
});

test("ignores external image URLs so existing posts remain unaffected", () => {
  const result = validateBlogVisualAssets(
    "![Remote source](https://images.example.test/photo.jpg)",
    {
      postSlug: "durable-post",
      publicDir: createPublicDirWithAsset(),
    }
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
});

test("rejects inline data image URIs", () => {
  const markdown = "![Inline SVG](data:image/svg+xml;base64,PHN2Zy8+)";
  const result = validateBlogVisualAssets(markdown, {
    postSlug: "durable-post",
    publicDir: createPublicDirWithAsset(),
  });

  assert.equal(isInlineImageDataUri("data:image/png;base64,AAAA"), true);
  assert.equal(result.valid, false);
  assert.match(result.issues[0].reason, /Inline data:image URIs are not allowed/);
  assert.throws(
    () =>
      assertValidBlogVisualAssets(markdown, {
        postSlug: "durable-post",
        publicDir: createPublicDirWithAsset(),
      }),
    /Invalid blog visual asset reference/
  );
});

test("rejects assets outside the current post asset directory", () => {
  const result = validateBlogVisualAssets(
    '![Other post diagram](/assets/blog/other-post/pipeline.svg "Other caption")',
    {
      postSlug: "durable-post",
      publicDir: createPublicDirWithAsset(),
    }
  );

  assert.equal(result.valid, false);
  assert.match(
    result.issues[0].reason,
    /must live under \/assets\/blog\/durable-post\//
  );
});

test("rejects missing assets and missing alt or caption metadata", () => {
  const result = validateBlogVisualAssets(
    "![](/assets/blog/durable-post/missing.svg)",
    {
      postSlug: "durable-post",
      publicDir: createPublicDirWithAsset(),
    }
  );

  assert.equal(result.valid, false);
  assert.equal(result.issues.length, 3);
  assert.match(result.issues[0].reason, /non-empty alt text/);
  assert.match(result.issues[1].reason, /caption\/title/);
  assert.match(result.issues[2].reason, /does not exist/);
});

test("rejects parent-directory path traversal segments", () => {
  const result = validateBlogVisualAssets(
    '![Unsafe](/assets/blog/durable-post/../other.svg "Unsafe caption")',
    {
      postSlug: "durable-post",
      publicDir: createPublicDirWithAsset(),
    }
  );

  assert.equal(result.valid, false);
  assert.match(result.issues[0].reason, /parent-directory segments/);
});

console.log(`PASS ${passed} FAIL ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
