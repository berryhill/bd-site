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
function textOnly(source) {
  return source
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const aboutSource = readFileSync(new URL("../src/pages/about.md", import.meta.url), "utf8");
const aboutLayoutSource = readFileSync(new URL("../src/layouts/AboutLayout.astro", import.meta.url), "utf8");
const expected = [
  "name</span><span class=\"sep\">:</span> <span class=\"v\">Matthew Berryhill</span>",
  "engineer + writer + operator",
  "Los Santos, Panamá",
  "berryhill.dev",
  "I build AI-native systems and write about the operator work behind them.",
  "The background is not a minimalist placeholder",
  "Experience arc",
  "2010 → present",
  "What I actually do",
  "Things I believe",
  "How I got here",
  "How I work with people",
  "FAQ",
  "If you want to hire me",
];
const timeline = [
  "Oct 2025 – Present Builder berryhill.dev · Self-employed · Remote",
  "Sep 2023 – Sep 2025 Contract Developer Tronic · Full-time · Remote Senior development roles.",
  "Oct 2019 – Sep 2023 Founder / CEO Pineapple Workshop · Self-employed · Denver, Colorado, United States",
  "Aug 2018 – Oct 2019 Software Engineer III Comcast · Denver Metropolitan Area Software Engineer III via Turnberry Solutions. Product Engineering for Commercial Voice.",
  "Apr 2018 – Jul 2018 Software Engineer Charter Communications · Denver Metropolitan Area Software Engineer at Charter Communications via Apex Systems. Video Operations.",
  "Oct 2017 – May 2018 Contract DevOps / Software Engineer Effortless Rental Group · Denver Metropolitan Area",
  "Jan 2017 – Aug 2017 Software Engineer Beatport · Denver Metropolitan Area Software engineering in digital music infrastructure.",
  "Mar 2016 – Jan 2017 Contract Developer MachineShop · Denver Metropolitan Area",
  "2010 – 2015 Founder/Musician Robotic Pirate Monkey LLC · Boulder, CO Founder and musician of the electronic music trio Robotic Pirate Monkey.",
];
const forbidden = [
  "I build AI-native systems that make autonomous work easier to inspect, trust, and improve.",
  "What I’m building",
  "How to read this site",
  "A Little Bit More About Matt (Like Anyone Cares)",
  "Passionate about crafting elegant systems",
  "The public background here stays intentionally narrow",
  "The background section is deliberately limited to facts verified in the current public readback",
  "Employer, client, acquisition, and year-by-year history is intentionally omitted until Matt verifies exact wording.",
  "public LinkedIn readback",
  "Education shown",
];
const rejectedTimelineClaims = [
  "Independent · agentic systems + RWA consulting",
  "Two retained clients",
  "Founding engineer · stealth (acquired)",
  "Sold to a public-markets infrastructure company",
  "Senior engineer · Compound Labs",
  "Engineer · Stripe",
  "First eng · acq'd analytics startup",
  "YC W15",
];

test("about page renders issue 73 prototype identity copy", () => {
  for (const copy of expected) includesCollapsed(aboutSource, copy);
});
test("about page renders Matt-provided experience timeline", () => {
  const aboutText = textOnly(aboutSource);
  for (const entry of timeline) assert(aboutText.includes(entry), `missing timeline entry: ${entry}`);
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
test("about page removes rejected fabricated timeline claims", () => {
  for (const claim of rejectedTimelineClaims) {
    assert.equal(aboutSource.includes(claim), false, `unexpected fabricated timeline claim: ${claim}`);
  }
});
console.log(`PASS ${passed} FAIL ${failed}`);
if (failed > 0) process.exitCode = 1;
