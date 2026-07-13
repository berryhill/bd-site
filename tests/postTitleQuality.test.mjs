/* eslint-disable no-console */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  auditPostTitleQuality,
  calculatePostTitleSimilarity,
  normalizePostTitleForComparison,
  renderPostTitleTag,
} from "../src/utils/postTitleQuality.ts";

const postsApiSource = readFileSync(
  new URL("../src/pages/api/posts.ts", import.meta.url),
  "utf8"
);

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

const recentPublicPosts = [
  {
    slug: "agentic-workflows-that-ship",
    title: "Agentic Workflows That Ship",
    pubDatetime: "2025-01-04T00:00:00Z",
  },
  {
    slug: "crypto-market-structure-for-builders",
    title: "Crypto Market Structure for Builders",
    pubDatetime: "2025-01-03T00:00:00Z",
  },
];

test("renders post title tag with site suffix", () => {
  assert.equal(
    renderPostTitleTag("Agentic Workflows That Ship", "berryhill.dev"),
    "Agentic Workflows That Ship | berryhill.dev"
  );
});

test("normalizes titles for comparison", () => {
  assert.equal(
    normalizePostTitleForComparison("Agentic Workflows: That Ship!"),
    "agentic workflows that ship"
  );
});

test("flags a title that passes alone but fails after site suffix", () => {
  const title = "A".repeat(55);
  assert.equal(title.length <= 65, true);

  const result = auditPostTitleQuality(title, [], { siteTitle: "berryhill.dev" });

  assert.equal(result.ok, false);
  assert.equal(result.renderedTitleLength, 71);
  assert.equal(result.issues[0].code, "rendered_title_too_long");
});

test("flags adjacent recent near-duplicate public titles above threshold", () => {
  const result = auditPostTitleQuality(
    "Agentic Workflows That Ship Fast",
    recentPublicPosts,
    { similarityThreshold: 0.8 }
  );

  const duplicateIssue = result.issues.find(
    issue => issue.code === "near_duplicate_title"
  );
  assert.ok(duplicateIssue);
  assert.equal(duplicateIssue.matches[0].slug, "agentic-workflows-that-ship");
  assert.ok(duplicateIssue.matches[0].similarity >= 0.8);
});

test("accepts distinct public post titles", () => {
  const result = auditPostTitleQuality(
    "How Review Gates Change AI-Native Delivery",
    recentPublicPosts
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.issues, []);
});

test("similarity returns exact match and separates distinct titles", () => {
  assert.equal(
    calculatePostTitleSimilarity("Agentic Workflows That Ship", "Agentic Workflows That Ship"),
    1
  );
  assert.ok(
    calculatePostTitleSimilarity(
      "Agentic Workflows That Ship",
      "Crypto Market Structure for Builders"
    ) < 0.5
  );
});

test("posts API returns clear 400 title-quality issue shape before writes", () => {
  assert.match(postsApiSource, /error: "Invalid post title quality"/);
  assert.match(postsApiSource, /details: result\.issues/);
  assert.match(postsApiSource, /titleQuality: \{/);
  assert.match(postsApiSource, /status: 400/);
  const postTitleGuardIndex = postsApiSource.indexOf(
    "const titleQualityError = await titleQualityValidationErrorResponse(title"
  );
  const postVisualGuardIndex = postsApiSource.indexOf(
    "const validationError = blogVisualValidationErrorResponse(content, slug);"
  );
  const patchTitleGuardIndex = postsApiSource.indexOf(
    "String(frontmatterData.title ?? \"\")"
  );
  const patchVisualGuardIndex = postsApiSource.indexOf(
    "const validationError = blogVisualValidationErrorResponse(\n      updatedContent"
  );

  assert.ok(postTitleGuardIndex > -1);
  assert.ok(postVisualGuardIndex > postTitleGuardIndex);
  assert.ok(patchTitleGuardIndex > -1);
  assert.ok(patchVisualGuardIndex > patchTitleGuardIndex);
});

console.log(`PASS ${passed} FAIL ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
