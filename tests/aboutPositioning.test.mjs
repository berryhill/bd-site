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
  const readable = source
    .replace(/<span class="drop-cap">([^<]+)<\/span>/g, "$1")
    .replace(/<a\s+[^>]*>([^<]+)<\/a>/g, "$1");
  assert(readable.replace(/\s+/g, " ").includes(expected));
}
const aboutSource = readFileSync(new URL("../src/pages/about.md", import.meta.url), "utf8");
const aboutLayoutSource = readFileSync(new URL("../src/layouts/AboutLayout.astro", import.meta.url), "utf8");
const expected = [
  "Matt Berryhill builds AI-native operating systems, agent workflows, and discovery surfaces that make autonomous work easier to inspect, trust, and improve.",
  "Matt Berryhill builds AI-native operating systems: agent workflows, discovery surfaces, review loops, and the governance layer that turns intelligent automation into work people can inspect and trust.",
  "This site is not a normal archive. It is the public surface of an operating system for AI-native work: posts, field notes, diagrams, and experiments that show how agents are actually used, where they break, and what has to exist around them for the work to compound.",
  "Agentic development loops that close faster and verify better.",
  "How to read this site",
  "schedule a call",
];
const forbidden = ["A Little Bit More About Matt (Like Anyone Cares)", "Passionate about crafting elegant systems", "exploring technical frontiers", "technology, design, and culture", "systems become stories"];

test("about page renders thesis-first operator identity copy", () => {
  for (const copy of expected) includesCollapsed(aboutSource, copy);
});
test("about page preserves imagery and Calendly destination", () => {
  assert.match(aboutSource, /src="\/matt_headshot\.jpeg"/);
  assert.match(aboutSource, /src="\/avatar\.png"/);
  assert.match(aboutSource, /href="https:\/\/calendly\.com\/matt-berryhill\/30min"/);
});
test("about layout passes page metadata description through", () => {
  assert.match(aboutLayoutSource, /description=\{frontmatter\.description\s+\?\?\s+SITE\.desc\}/);
});
test("about page does not retain broad generic bio copy", () => {
  const normalized = aboutSource.replace(/\s+/g, " ");
  for (const term of forbidden) assert.equal(normalized.includes(term), false, `unexpected about copy: ${term}`);
});
console.log(`PASS ${passed} FAIL ${failed}`);
if (failed > 0) process.exitCode = 1;
