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
const postsIndexSource = readFileSync(new URL("../src/pages/posts/index.astro", import.meta.url), "utf8");
const postsArchiveSource = readFileSync(new URL("../src/components/TerminalPostsArchive.astro", import.meta.url), "utf8");
const llmsRouteSource = readFileSync(new URL("../src/pages/llms.txt.ts", import.meta.url), "utf8");
const expectedLlmsDescription = "Field notes on AI-native discovery systems, agent governance, provenance, review gates, protocol boundaries, and the operator work required to turn agent output into shipped proof.";
const forbidden = ["MCP server", "telemetry product", "fleet dashboard", "production queue", "API surface"];

test("posts archive renders issue 73 terminal browsing surface", () => {
  includesCollapsed(postsArchiveSource, "posts<span class=\"slash\">/</span><b>archive</b>");
  includesCollapsed(postsArchiveSource, "Long-form notes on <b>agentic-first development</b>, AI / ML systems, blockchain rails, crypto market structure, digital music, and the small frictions that change when intelligent automation moves into the loop.");
  includesCollapsed(postsArchiveSource, "grep -i ...");
  includesCollapsed(postsArchiveSource, "cat pinned.md");
  includesCollapsed(postsArchiveSource, "cat subscribe.md");
});
test("posts archive metadata uses the prototype description", () => {
  includesCollapsed(postsPageSource, "Long-form notes on agentic-first development, AI / ML systems, blockchain rails, crypto market structure, digital music, and the small frictions that change when intelligent automation moves into the loop.");
  assert.doesNotMatch(postsPageSource, /All the articles I've posted\./);
});
test("posts archive keeps pagination, filtering, and live post routing intact", () => {
  assert.match(postsPageSource, /!data\.draft/);
  assert.match(postsPageSource, /getSortedPosts\(posts\)/);
  assert.match(postsPageSource, /<TerminalPostsArchive sortedPosts=\{sortedPosts\} \{currentPage\} \/>/);
  assert.match(postsIndexSource, /currentPage=\{1\}/);
  assert.match(postsArchiveSource, /paginatedPosts = sortedPosts\.slice\(start, end\)/);
  assert.match(postsArchiveSource, /<Pagination \{page\} \/>/);
  assert.match(postsArchiveSource, /getPath\(post\.id, post\.filePath\)/);
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
