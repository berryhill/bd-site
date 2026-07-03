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

function assertSourceIncludesCollapsedWhitespace(source, expected) {
  const readableSource = source
    .replace(/<span class="drop-cap">([^<]+)<\/span>/g, "$1")
    .replace(/<a\s+[^>]*>([^<]+)<\/a>/g, "$1");
  assert.match(readableSource.replace(/\s+/g, " "), new RegExp(escapeRegExp(expected)));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const aboutSource = readFileSync(new URL("../src/pages/about.md", import.meta.url), "utf8");
const aboutLayoutSource = readFileSync(
  new URL("../src/layouts/AboutLayout.astro", import.meta.url),
  "utf8"
);
const normalizedAboutSource = aboutSource.replace(/\s+/g, " ");

const expectedAboutCopy = {
  description:
    "Matt Berryhill is an agentic-first builder focused on AI-native systems, agent workflows, governance, provenance, and the operating discipline required to turn intelligent automation into shipped work.",
  hero:
    "Matt Berryhill is an agentic-first builder focused on the operating layer of AI-native systems.",
  opening:
    "He works where intelligent products, agent workflows, governance, and technical culture meet: the place where ideas stop being demos and start becoming systems people can review, trust, and ship.",
  discipline:
    "Berryhill.dev is where Matt writes through that work in public. The through-line is not that every tool is new. The through-line is that agentic systems need operating discipline: authority, provenance, review, handoffs, memory, escalation, and proof that the work actually landed.",
  teams:
    "Matt thinks about products and teams as living systems. Skill matters, but mindset matters more: hunger, curiosity, consistency, and the ability to notice where the workflow is lying to you. The best teams balance autonomy with alignment, reward outcomes over optics, and make progress visible enough to inspect.",
  collaboration:
    "If you want to talk about AI-native products, agent operations, governance, discovery systems, or the gap between a promising demo and a reliable workflow, schedule a call.",
};

const forbiddenAboutCopy = [
  "A Little Bit More About Matt (Like Anyone Cares)",
  "Passionate about crafting elegant systems",
  "exploring technical frontiers",
  "technology, design, and culture",
  "systems become stories",
  "grow through shared achievement rather than individual heroics",
];

test("about page renders the approved operating-layer positioning copy", () => {
  for (const copy of Object.values(expectedAboutCopy)) {
    assertSourceIncludesCollapsedWhitespace(aboutSource, copy);
  }
});

test("about page preserves the existing imagery and Calendly destination", () => {
  assert.match(aboutSource, /src="\/matt_headshot\.jpeg"/);
  assert.match(aboutSource, /src="\/avatar\.png"/);
  assert.match(
    aboutSource,
    /href="https:\/\/calendly\.com\/matt-berryhill\/30min"/
  );
});

test("about layout passes page metadata description through to the base layout", () => {
  assert.match(
    aboutLayoutSource,
    /<Layout\s+title=\{`\$\{frontmatter\.title\} \| \$\{SITE\.title\}`\}\s+description=\{frontmatter\.description\s+\?\?\s+SITE\.desc\}/
  );
});

test("about page does not retain broad generic bio copy", () => {
  for (const forbidden of forbiddenAboutCopy) {
    assert.equal(
      normalizedAboutSource.includes(forbidden),
      false,
      `unexpected about copy: ${forbidden}`
    );
  }
});

console.log(`PASS ${passed} FAIL ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
