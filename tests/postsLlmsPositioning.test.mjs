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
function includesCollapsed(source, expected) {
  assert(source.replace(/\s+/g, " ").includes(expected));
}
const postsPageSource = readFileSync(new URL("../src/pages/posts/page/[page].astro", import.meta.url), "utf8");
const llmsRouteSource = readFileSync(new URL("../src/pages/llms.txt.ts", import.meta.url), "utf8");
const expectedLlmsDescription = "Field notes on AI-native discovery systems, agent governance, provenance, review gates, protocol boundaries, and the operator work required to turn agent output into shipped proof.";
const forbidden = ["MCP server", "telemetry product", "fleet dashboard", "production queue", "API surface"];

test("posts index renders terminal browsing surface", () => {
  assert.match(postsPageSource, /posts-terminal-title/);
  includesCollapsed(postsPageSource, "Posts as artifacts from the operating system.");
  includesCollapsed(postsPageSource, "Read these as a developing operating manual: agent governance, discovery systems, protocol boundaries, verification loops, and the human decisions that keep autonomous work accountable.");
  includesCollapsed(postsPageSource, "ls ~/berryhill.dev/posts --group-by lane");
});
test("posts index metadata uses the approved description", () => {
  includesCollapsed(postsPageSource, "Essays and field notes from Matt Berryhill on agent governance, AI-native workflows, protocol boundaries, continuity layers, IP intelligence, and shipped-work proof.");
  assert.doesNotMatch(postsPageSource, /All the articles I've posted\./);
});
test("posts index keeps pagination, filtering, and card rendering intact", () => {
  assert.match(postsPageSource, /!data\.draft/);
  assert.match(postsPageSource, /getSortedPosts\(posts\)/);
  assert.match(postsPageSource, /paginatedPosts = sortedPosts\.slice\(start, end\)/);
  assert.match(postsPageSource, /<Card variant="h3" \{\.\.\.data\} \/>/);
  assert.match(postsPageSource, /<Pagination \{page\} \/>/);
});
test("llms.txt route is source-backed and uses the approved safe description", () => {
  assert.equal(SITE.desc, expectedLlmsDescription);
  assert.match(llmsRouteSource, /export const GET/);
  assert.match(llmsRouteSource, /getLiveCollection\("liveBlog"\)/);
  assert.match(llmsRouteSource, /Representative posts/);
  assert.match(llmsRouteSource, /SITE\.desc/);
});
test("llms.txt source does not invent forbidden product or fleet claims", () => {
  for (const term of forbidden) assert.equal(llmsRouteSource.includes(term), false, `unexpected llms.txt claim: ${term}`);
});
console.log(`PASS ${passed} FAIL ${failed}`);
if (failed > 0) process.exitCode = 1;
