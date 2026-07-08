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

function source(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

function assertIncludes(sourceText, expected) {
  assert.match(sourceText.replace(/\s+/g, " "), new RegExp(escapeRegExp(expected)));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const cardSource = source("../src/components/Card.astro");
const mainSource = source("../src/layouts/Main.astro");
const footerSource = source("../src/components/Footer.astro");
const tagsSource = source("../src/pages/tags/index.astro");
const tagSource = source("../src/pages/tags/[tag]/[...page].astro");
const archivesSource = source("../src/pages/archives/index.astro");
const globalCssSource = source("../src/styles/global.css");

const forbiddenGenericShellCopy = [
  "All the tags used in posts.",
  "All the articles with the tag",
  "All the articles I've archived.",
  "Clean, Minimal Blog Theme",
];

test("card treatment keeps terminal file cards readable", () => {
  assert.match(cardSource, /class="terminal-post-card"/);
  assert.match(cardSource, /terminal-post-card__path/);
  assert.match(cardSource, /open artifact →/);
  assert.match(cardSource, /font-size:\s*clamp\(1\.12rem, 1rem \+ 0\.35vw, 1\.34rem\);/);
  assert.match(cardSource, /-webkit-line-clamp:\s*4;/);
  assert.doesNotMatch(cardSource, /height:\s*5\.6rem;/);
});

test("main page shell uses operating-manual framing without changing slot mechanics", () => {
  assert.match(mainSource, /<header class="page-shell">/);
  assert.match(mainSource, /<p class="page-shell-kicker">Operating manual<\/p>/);
  assert.match(mainSource, /<h1 class="page-shell-title">/);
  assert.match(mainSource, /page-shell-deck/);
  assert.match(mainSource, /<slot \/>/);
  assert.match(mainSource, /sessionStorage\.setItem\("backUrl", backUrl\)/);
});

test("footer CTA aligns with the approved operating-questions direction", () => {
  assertIncludes(footerSource, "Bring the operating questions to a conversation.");
  assert.match(footerSource, /<Socials centered \/>/);
  assert.match(footerSource, /© \{currentYear\} All rights reserved\./);
});

test("tags shell keeps operating-manual framing while stale archives route is hidden", () => {
  assertIncludes(
    tagsSource,
    "Use the tag map as an index of operating questions: governance, protocols, provenance, continuity, and shipped-work proof."
  );
  assertIncludes(
    tagSource,
    "A focused reading path for ${tagName}: related field notes, evidence trails, and operating questions from the archive."
  );
  assert.match(archivesSource, /return new Response\(null, \{ status: 404 \}\);/);

  const combined = `${tagsSource}\n${tagSource}\n${archivesSource}\n${globalCssSource}`;
  for (const forbidden of forbiddenGenericShellCopy) {
    assert.equal(combined.includes(forbidden), false, `unexpected generic shell copy: ${forbidden}`);
  }
});

console.log(`PASS ${passed} FAIL ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
