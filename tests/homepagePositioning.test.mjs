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

const homepageSource = readFileSync(new URL("../src/pages/index.astro", import.meta.url), "utf8");
const pillarModalSource = readFileSync(
  new URL("../src/components/PillarModal.astro", import.meta.url),
  "utf8"
);
const normalizedHomepageSource = homepageSource.replace(/\s+/g, " ");
const normalizedTerminalSource = `${homepageSource}\n${pillarModalSource}`.replace(
  /\s+/g,
  " "
);

const expectedHomepageCopy = {
  opening: "Matt Berryhill builds AI-native discovery systems.",
  subhead:
    "Berryhill.dev is his public field notebook on agentic workflows, governance, provenance, and the operator judgment required to turn AI work into shipped proof.",
  supporting:
    "Most AI content stops at tools, prompts, and demos. The harder problem is building systems that know who owns the work, what evidence was used, what changed, what shipped, and where a human must stay in the loop. This site tracks that layer: the workflows, protocols, review gates, and operating habits that make agentic systems useful outside the demo.",
  startHere:
    "Start with the operating layer: agent governance, shipped-work proof, protocol boundaries, small named fleets, continuity, and the systems that keep AI work accountable.",
  cta:
    "Read the field notes, then bring the operating questions to a conversation.",
};

const expectedSiteDescription =
  "Field notes on AI-native discovery systems, agent governance, provenance, review gates, protocol boundaries, and the operator work required to turn agent output into shipped proof.";

const expectedTerminalCopy = {
  prompt: "berryhill.dev / field-notes",
  status:
    "Public notes on AI-native systems, agent governance, provenance, and shipped proof.",
  safety: "Interface metaphor, not live telemetry.",
};

const expectedTerminalCommands = [
  "open governance checklist",
  "inspect shipped-work proof",
  "trace protocol boundaries",
  "read continuity layer notes",
  "schedule operator conversation",
];

const expectedSafeModuleLabels = [
  "Reading path",
  "Field note",
  "Operator question",
  "Evidence trail",
  "What this changes",
];

const forbiddenHomepageCopy = [
  "Welcome to my corner of the internet",
  "live AI operating system",
  "fleet dashboard",
  "MCP server",
  "API surface",
  "telemetry product",
  "production queue",
];

const forbiddenTerminalClaims = [
  "Live fleet status",
  "MCP endpoint",
  "API console",
  "verified telemetry",
  "production queue",
];

function assertSourceIncludesCollapsedWhitespace(source, expected) {
  assert.match(source.replace(/\s+/g, " "), new RegExp(escapeRegExp(expected)));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("homepage renders the approved positioning copy surfaces", () => {
  for (const copy of Object.values(expectedHomepageCopy)) {
    assertSourceIncludesCollapsedWhitespace(homepageSource, copy);
  }
});

test("site metadata description matches the approved homepage positioning", () => {
  assert.equal(SITE.desc, expectedSiteDescription);
});

test("homepage keeps the existing post lists and reader links present", () => {
  assert.match(homepageSource, /featuredPosts\.length > 0/);
  assert.match(homepageSource, /recentPosts\.length > 0/);
  assert.match(homepageSource, /href="\/rss\.xml"/);
  assert.match(homepageSource, /<Socials \/>/);
  assert.match(homepageSource, /<LinkButton href="\/posts\/"/);
});

test("homepage terminal interface uses the approved field-notes copy deck", () => {
  for (const copy of Object.values(expectedTerminalCopy)) {
    assertSourceIncludesCollapsedWhitespace(homepageSource, copy);
  }

  for (const command of expectedTerminalCommands) {
    assertSourceIncludesCollapsedWhitespace(homepageSource, command);
  }
});

test("terminal commands remain keyboard-accessible modal triggers", () => {
  assert.match(homepageSource, /<button\s+type="button"/);

  for (const pillar of [
    "governance",
    "proof",
    "protocol",
    "continuity",
    "conversation",
  ]) {
    assert.match(homepageSource, new RegExp(`data-pillar="${pillar}"`));
  }

  assert.match(pillarModalSource, /dataset\.pillar/);
  assert.match(pillarModalSource, /addEventListener\("click", \(\) => openModal/);
  assert.match(pillarModalSource, /e\.key === "Escape"/);
});

test("modal copy uses safe module labels and repeats the metaphor safety label", () => {
  for (const label of expectedSafeModuleLabels) {
    assertSourceIncludesCollapsedWhitespace(pillarModalSource, label);
  }

  assert.match(pillarModalSource, /not live telemetry/);
  assert.match(pillarModalSource, /interface framing only/);
});

test("homepage does not retain broad generic copy or forbidden product claims", () => {
  for (const forbidden of forbiddenHomepageCopy) {
    assert.equal(
      normalizedHomepageSource.includes(forbidden),
      false,
      `unexpected homepage copy: ${forbidden}`
    );
  }
});

test("terminal interface and modal avoid forbidden unverified telemetry claims", () => {
  for (const forbidden of forbiddenTerminalClaims) {
    assert.equal(
      normalizedTerminalSource.includes(forbidden),
      false,
      `unexpected terminal/modal claim: ${forbidden}`
    );
  }
});

console.log(`PASS ${passed} FAIL ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
