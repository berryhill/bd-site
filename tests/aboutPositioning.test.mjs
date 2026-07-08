/* eslint-disable no-console */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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
  const readable = source.replace(/<a\s+[^>]*>([^<]+)<\/a>/g, "$1");
  assert(readable.replace(/\s+/g, " ").includes(expected));
}
const aboutSource = readFileSync(new URL("../src/pages/about.md", import.meta.url), "utf8");
const aboutLayoutSource = readFileSync(new URL("../src/layouts/AboutLayout.astro", import.meta.url), "utf8");
const expected = [
  "name</span><span class=\"sep\">:</span> <span class=\"v\">Matthew Berryhill</span>",
  "engineer + writer + RWA consultant",
  "Austin, TX</span> <span class=\"v dim\">(GMT−5)",
  "selective consulting · 2 slots open Q3 2026",
  "I build agentic software. I write about it. I help capital markets people understand both.",
  "What I actually do",
  "Things I believe",
  "How I got here",
  "How I work with people",
  "FAQ",
  "If you want to hire me",
];
const forbidden = ["I build AI-native systems that make autonomous work easier to inspect, trust, and improve.", "What I’m building", "How to read this site", "A Little Bit More About Matt (Like Anyone Cares)", "Passionate about crafting elegant systems"];

test("about page renders issue 73 prototype identity copy", () => {
  for (const copy of expected) includesCollapsed(aboutSource, copy);
});
test("about page preserves contact destination and terminal classes", () => {
  assert.match(aboutSource, /href="https:\/\/calendly\.com\/matt-berryhill\/30min"/);
  for (const cls of ["window", "titlebar", "frontmatter", "summary-grid", "toc", "belief", "timeline", "contact-grid"]) {
    assert.match(aboutSource, new RegExp(`class=\\"[^\\"]*${cls}`));
  }
});
test("about layout passes page metadata description through", () => {
  assert.match(aboutLayoutSource, /description=\{frontmatter\.description\s+\?\?\s+SITE\.desc\}/);
});
test("about page does not retain old hybrid/generic bio copy", () => {
  const normalized = aboutSource.replace(/\s+/g, " ");
  for (const term of forbidden) assert.equal(normalized.includes(term), false, `unexpected about copy: ${term}`);
});
console.log(`PASS ${passed} FAIL ${failed}`);
if (failed > 0) process.exitCode = 1;
