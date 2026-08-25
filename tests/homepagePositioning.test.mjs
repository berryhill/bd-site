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
const homepageSource = readFileSync(
  new URL("../src/pages/index.astro", import.meta.url),
  "utf8"
);
const normalizedHomepage = homepageSource.replace(/\s+/g, " ");
const expectedSiteDescription =
  "Field notes on AI-native discovery systems, agent governance, provenance, review gates, protocol boundaries, and the operator work required to turn agent output into shipped proof.";
const hierarchyAnchors = [
  'id="outcomes"',
  "Measurable business outcomes, delivered through accountable AI systems.",
  "Berryhill Dev builds and operates bounded AI systems",
  'id="economic-problem"',
  'id="proof"',
  "Evidence remains attached to the claim it supports.",
  'id="accountability"',
  "Berryhill Dev is accountable for the work. Matt Berryhill is accountable for the consequential calls.",
  'id="delivery-leverage"',
  "Agents are delivery leverage—not the product and not the authority.",
  'id="methods"',
  'id="outcome-discovery"',
  "Initial investigation is designed around non-sensitive operating context.",
  "Delivery mechanics and privacy requirements are confirmed before any subsequent work.",
  'id="start"',
  "ls featured/ --sort=latest",
  "ls -la recent/",
  "cat .env",
];
const forbidden = [
  "Welcome to my corner of the internet",
  "Matt Berryhill builds AI-native operating systems in public.",
  "Terminal metaphor. Real claims only.",
  "Not a nicer blog. A public interface into the operating layer.",
  "Live fleet status",
  "verified telemetry",
];

test("homepage renders the accepted organization-first outcome hierarchy in semantic order", () => {
  for (const copy of hierarchyAnchors) includesCollapsed(homepageSource, copy);
  const positions = hierarchyAnchors.map(copy => normalizedHomepage.indexOf(copy));
  for (let index = 1; index < positions.length; index += 1) {
    assert.ok(
      positions[index] > positions[index - 1],
      `${hierarchyAnchors[index]} must follow ${hierarchyAnchors[index - 1]}`
    );
  }
});
test("site author stays stable while homepage metadata becomes organization-first", () => {
  assert.equal(SITE.desc, expectedSiteDescription);
  assert.equal(SITE.author, "Berryhill");
  assert.equal(SITE.organization.name, "Berryhill Dev");
  assert.equal(SITE.operator.name, "Matt Berryhill");
  assert.equal(
    SITE.homepage.description,
    "Berryhill Dev builds and operates bounded AI systems for measurable business outcomes, with explicit evidence boundaries and human accountability."
  );
});
test("homepage keeps live post mapping and reader links present", () => {
  assert.match(homepageSource, /getLiveBlogPosts\(\)/);
  assert.match(homepageSource, /getSortedPosts\(posts \|\| \[\]\)/);
  assert.match(homepageSource, /selectHomepagePosts\(sortedPosts\)/);
  assert.match(
    homepageSource,
    /const \{ featuredPosts, recentPosts \} = selectHomepagePosts\(sortedPosts\);/
  );
  assert.match(homepageSource, /href="\/rss\.xml"/);
  assert.match(homepageSource, /href="\/posts\/"/);
  assert.match(homepageSource, /getPath\(post\.id, post\.filePath\)/);
});
test("homepage keeps the existing terminal window identity", () => {
  for (const cls of [
    "window",
    "titlebar",
    "gnome-ctrls",
    "tabstrip",
    "term",
    "line",
    "ps1",
    "cmd",
    "files",
    "file",
    "ls-row",
  ]) {
    assert.match(homepageSource, new RegExp(`class=\\"[^\\"]*${cls}`));
  }
});
test("homepage CTAs use existing boundaries and no invented routes", () => {
  includesCollapsed(homepageSource, 'href="/about/#connect"');
  includesCollapsed(homepageSource, "Tell us what needs to improve");
  includesCollapsed(homepageSource, 'href="#proof"');
  includesCollapsed(homepageSource, "See how outcomes are proven");
  assert.doesNotMatch(homepageSource, /href="\/(?:start|outcome-discovery)\/?"/);
  assert.doesNotMatch(homepageSource, /SITE\.calendly/);
});
test("homepage removes person-first positioning, fake telemetry, and command input", () => {
  for (const stale of [
    "matt<b>@berryhill</b>",
    "builder · operator · agent conductor.",
    "curl GET /fleet",
    "cat manifesto.md",
    "cmdbar",
    "verified agents",
  ]) {
    assert.equal(homepageSource.includes(stale), false, `unexpected stale homepage anchor: ${stale}`);
  }
  assert.doesNotMatch(homepageSource, /<form|<input/);
});
test("homepage avoids old hybrid and telemetry claims", () => {
  for (const term of forbidden) {
    assert.equal(normalizedHomepage.includes(term), false, `unexpected claim: ${term}`);
  }
});

console.log(`PASS ${passed} FAIL ${failed}`);
if (failed > 0) process.exitCode = 1;
