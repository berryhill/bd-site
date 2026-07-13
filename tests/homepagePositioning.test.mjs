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
const homepageSource = readFileSync(new URL("../src/pages/index.astro", import.meta.url), "utf8");
const expectedSiteDescription = "Field notes on AI-native discovery systems, agent governance, provenance, review gates, protocol boundaries, and the operator work required to turn agent output into shipped proof.";
const prototypeAnchors = [
  "matt<b>@berryhill</b>",
  "builder · operator · agent conductor.",
  "I run a fleet of specialized AI agents that design, research, code, review, write, analyze markets, and ship software with me. This site is the public terminal into that operating system.",
  "curl GET /fleet",
  "cat manifesto.md",
  "ls featured/ --sort=latest",
  "ls -la recent/",
  "cat .env",
];
const forbidden = ["Welcome to my corner of the internet", "Matt Berryhill builds AI-native operating systems in public.", "Terminal metaphor. Real claims only.", "Not a nicer blog. A public interface into the operating layer.", "Live fleet status", "verified telemetry"];

test("homepage renders issue 73 prototype copy anchors", () => {
  for (const copy of prototypeAnchors) includesCollapsed(homepageSource, copy);
  assert.doesNotMatch(homepageSource, /ls featured\/ --sort=stars/);
});
test("site metadata description remains approved and safe", () => {
  assert.equal(SITE.desc, expectedSiteDescription);
});
test("homepage keeps live post mapping and reader links present", () => {
  assert.match(homepageSource, /selectHomepagePosts\(sortedPosts\)/);
  assert.match(homepageSource, /const \{ featuredPosts, recentPosts \} = selectHomepagePosts\(sortedPosts\);/);
  assert.match(homepageSource, /href="\/rss\.xml"/);
  assert.match(homepageSource, /href="\/posts\/"/);
  assert.match(homepageSource, /getPath\(post\.id, post\.filePath\)/);
});
test("homepage uses prototype terminal window contract", () => {
  for (const cls of ["window", "titlebar", "gnome-ctrls", "tabstrip", "term", "line", "ps1", "cmd", "files", "file", "ls-row"]) {
    assert.match(homepageSource, new RegExp(`class=\\"[^\\"]*${cls}`));
  }
});
test("homepage avoids old hybrid/product telemetry claims", () => {
  const normalized = homepageSource.replace(/\s+/g, " ");
  for (const term of forbidden) assert.equal(normalized.includes(term), false, `unexpected claim: ${term}`);
});
console.log(`PASS ${passed} FAIL ${failed}`);
if (failed > 0) process.exitCode = 1;
