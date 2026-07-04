/* eslint-disable no-console */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SITE } from "../src/config.ts";

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

function assertSourceIncludesCollapsedWhitespace(source, expected) {
  assert.match(source.replace(/\s+/g, " "), new RegExp(escapeRegExp(expected)));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const postsPageSource = readFileSync(
  new URL("../src/pages/posts/page/[page].astro", import.meta.url),
  "utf8"
);
const llmsRouteSource = readFileSync(
  new URL("../src/pages/llms.txt.ts", import.meta.url),
  "utf8"
);

const expectedPostsCopy = {
  title: "Posts",
  deck:
    "Field notes on agentic systems, governance, protocols, provenance, IP intelligence, continuity, and the operator work that turns AI output into shipped proof.",
  intro:
    "Read these as a developing operating manual. Some pieces are tactical checklists. Some are system maps. Some are arguments about where AI-native work is actually bottlenecked: not in model access, but in authority, review, memory, handoffs, and accountability.",
  metadata:
    "Essays and field notes from Matt Berryhill on agent governance, AI-native workflows, protocol boundaries, continuity layers, IP intelligence, and shipped-work proof.",
};

const expectedLlmsDescription =
  "Field notes on AI-native discovery systems, agent governance, provenance, review gates, protocol boundaries, and the operator work required to turn agent output into shipped proof.";

const forbiddenLlmsClaims = [
  "MCP server",
  "telemetry product",
  "fleet dashboard",
  "production queue",
  "API surface",
];

test("posts index source renders the approved title, deck, and intro copy", () => {
  assert.match(postsPageSource, /pageTitle=\"Posts\"/);
  assertSourceIncludesCollapsedWhitespace(postsPageSource, expectedPostsCopy.deck);
  assertSourceIncludesCollapsedWhitespace(postsPageSource, expectedPostsCopy.intro);
});

test("posts index metadata uses the approved description", () => {
  assertSourceIncludesCollapsedWhitespace(postsPageSource, expectedPostsCopy.metadata);
  assert.doesNotMatch(postsPageSource, /All the articles I've posted\./);
});

test("posts index keeps pagination and card rendering intact", () => {
  assert.match(postsPageSource, /getSortedPosts\(posts\)/);
  assert.match(postsPageSource, /paginatedPosts = sortedPosts\.slice\(start, end\)/);
  assert.match(postsPageSource, /<Card variant=\"h3\" \{\.\.\.data\} \/>/);
  assert.match(postsPageSource, /<Pagination \{page\} \/>/);
});

test("llms.txt route is source-backed and uses the approved safe description", () => {
  assert.equal(SITE.desc, expectedLlmsDescription);
  assert.match(llmsRouteSource, /export const GET/);
  assert.match(llmsRouteSource, /getLiveCollection\(\"liveBlog\"\)/);
  assert.match(llmsRouteSource, /Representative posts/);
  assert.match(llmsRouteSource, /SITE\.desc/);
});

test("llms.txt source does not invent forbidden product or fleet claims", () => {
  for (const forbidden of forbiddenLlmsClaims) {
    assert.equal(
      llmsRouteSource.includes(forbidden),
      false,
      `unexpected llms.txt claim: ${forbidden}`
    );
  }
});

console.log(`PASS ${passed} FAIL ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
