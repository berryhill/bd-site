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
const pillarModalSource = readFileSync(new URL("../src/components/PillarModal.astro", import.meta.url), "utf8");
const normalized = `${homepageSource}\n${pillarModalSource}`.replace(/\s+/g, " ");

const expected = [
  "Matt Berryhill builds AI-native operating systems in public.",
  "Berryhill.dev is the public surface for agent workflows, discovery systems, governance, provenance, and the operator judgment required to turn AI output into shipped proof.",
  "The useful question is not whether agents can produce more output. It is whether the system can preserve context, ownership, verification, and memory long enough for the work to compound.",
  "Terminal metaphor. Real claims only.",
  "Start with the operating layer: agent governance, shipped-work proof, protocol boundaries, discovery systems, continuity, and the public operating models that keep AI work accountable.",
];
const expectedSiteDescription = "Field notes on AI-native discovery systems, agent governance, provenance, review gates, protocol boundaries, and the operator work required to turn agent output into shipped proof.";
const expectedTerminalCommands = ["open governance checklist", "inspect shipped-work proof", "trace protocol boundaries", "read continuity layer notes", "schedule operator conversation"];
const forbidden = ["Welcome to my corner of the internet", "live AI operating system", "fleet dashboard", "MCP server", "API surface", "telemetry product", "production queue", "Live fleet status", "verified telemetry"];

test("homepage renders terminal/operator positioning copy", () => {
  for (const copy of expected) includesCollapsed(homepageSource, copy);
});
test("site metadata description remains approved and safe", () => {
  assert.equal(SITE.desc, expectedSiteDescription);
});
test("homepage keeps existing post lists and reader links present", () => {
  assert.match(homepageSource, /featuredPosts\.length > 0/);
  assert.match(homepageSource, /recentPosts\.length > 0/);
  assert.match(homepageSource, /href="\/rss\.xml"/);
  assert.match(homepageSource, /<Socials \/>/);
  assert.match(homepageSource, /href="\/posts\/"/);
});
test("terminal commands remain keyboard-accessible modal triggers", () => {
  assert.match(homepageSource, /<button\s+type="button"/);
  for (const pillar of ["governance", "proof", "protocol", "continuity", "conversation"]) assert.match(homepageSource, new RegExp(`data-pillar="${pillar}"`));
  for (const command of expectedTerminalCommands) includesCollapsed(homepageSource, command);
  assert.match(pillarModalSource, /dataset\.pillar/);
  assert.match(pillarModalSource, /e\.key === "Escape"/);
});
test("homepage and modal avoid forbidden product/telemetry claims", () => {
  for (const term of forbidden) assert.equal(normalized.includes(term), false, `unexpected claim: ${term}`);
});
console.log(`PASS ${passed} FAIL ${failed}`);
if (failed > 0) process.exitCode = 1;
