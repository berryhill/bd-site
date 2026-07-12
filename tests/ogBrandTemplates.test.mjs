/* eslint-disable no-console */
import assert from "node:assert/strict";
import {
  buildPostOgTree,
  buildSiteOgTree,
  OG_BRAND,
  truncatePreviewText,
} from "../src/utils/og-templates/brand.js";

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

function stringifyTree(tree) {
  return JSON.stringify(tree);
}

function collectStrings(value, strings = []) {
  if (typeof value === "string") {
    strings.push(value);
    return strings;
  }

  if (Array.isArray(value)) {
    value.forEach(item => collectStrings(item, strings));
    return strings;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach(item => collectStrings(item, strings));
  }

  return strings;
}

const site = {
  title: "berryhill.dev",
  website: "https://berryhill.dev/",
  author: "Berryhill",
  desc: "Field notes on AI-native discovery systems, agent governance, provenance, review gates, protocol boundaries, and the operator work required to turn agent output into shipped proof.",
};

const post = {
  data: {
    title: "Agentic systems need review gates before they need more autonomy",
    author: "Berryhill",
  },
};

const oldOffBrandColors = ["#1c1917", "#ff8c42", "#a0153e"];

test("site OG tree uses the terminal/operator brand system", () => {
  const tree = buildSiteOgTree(site);
  const serialized = stringifyTree(tree);

  assert.match(serialized, /berryhill/);
  assert.match(serialized, /ship --with-proof/);
  assert.match(serialized, /AI-native discovery/);
  assert.match(serialized, /shipped systems/);
  assert.match(serialized, new RegExp(OG_BRAND.background.replace("#", "#")));
  assert.match(serialized, new RegExp(OG_BRAND.accent.replace("#", "#")));
  assert.match(serialized, new RegExp(OG_BRAND.accentSecondary.replace("#", "#")));

  oldOffBrandColors.forEach(color => assert.doesNotMatch(serialized, new RegExp(color)));
});

test("post OG tree applies the same brand system and representative post metadata", () => {
  const tree = buildPostOgTree(post, site);
  const serialized = stringifyTree(tree);

  assert.match(serialized, /field note/);
  assert.match(serialized, /review --gate external-link-preview/);
  assert.match(serialized, /terminal brand system active/);
  assert.match(serialized, /Agentic systems need review gates/);
  assert.match(serialized, /Berryhill/);
  assert.match(serialized, new RegExp(OG_BRAND.background.replace("#", "#")));
  assert.match(serialized, new RegExp(OG_BRAND.border.replace("#", "#")));

  oldOffBrandColors.forEach(color => assert.doesNotMatch(serialized, new RegExp(color)));
});

test("long post titles are truncated for external preview safety", () => {
  const longTitle = "A".repeat(140);
  const tree = buildPostOgTree({ data: { title: longTitle, author: "Berryhill" } }, site);
  const strings = collectStrings(tree);
  const renderedTitle = strings.find(value => value.startsWith("A"));

  assert.equal(renderedTitle.length, 96);
  assert.equal(renderedTitle.endsWith("…"), true);
});

test("preview text truncation validates edge and error paths", () => {
  assert.equal(truncatePreviewText("short", 8), "short");
  assert.equal(truncatePreviewText("123456789", 8), "1234567…");
  assert.throws(() => truncatePreviewText(null, 8), /Preview text must be a string/);
  assert.throws(
    () => truncatePreviewText("valid", 7),
    /maxLength must be an integer of at least 8/
  );
});

test("OG builders reject missing required data instead of rendering broken cards", () => {
  assert.throws(() => buildSiteOgTree({ ...site, desc: "" }), /Site description is required/);
  assert.throws(() => buildPostOgTree({ data: { author: "Berryhill" } }, site), /Post title is required/);
  assert.throws(() => buildPostOgTree(null, site), /Post data is required/);
});

console.log(`PASS ${passed} FAIL ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
