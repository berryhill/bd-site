/* eslint-disable no-console */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  curatedHomepageFleet,
  getHomepageFleetCountLabel,
} from "../src/utils/homepageFleet.ts";

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

const homepageSource = readFileSync(
  new URL("../src/pages/index.astro", import.meta.url),
  "utf8"
);

const expectedFleet = [
  [
    "default-silas",
    "silas",
    "default Hermes operator/orchestrator; task queue, plans, dispatch, and system support",
  ],
  [
    "ada-vector",
    "ada-vector",
    "Taskflow intelligence + evaluation data; structured evidence, verifier maps, quantum-readiness scoring, eval/preference datasets",
  ],
  [
    "archer",
    "archer",
    "Financial markets analysis; trade/risk evaluation, market structure, technical levels, and thesis tracking",
  ],
  [
    "chip-renwick",
    "chip-renwick",
    "Broker-dealer compliance engineering; FINRA controls, supervision, books/records, audit evidence",
  ],
  [
    "luca",
    "luca",
    "Brand architecture + marketing strategy; content systems, voice, campaigns, and performance interpretation",
  ],
  [
    "nick-mercer",
    "nick-mercer",
    "OpenSCAD physical design; parametric parts, prototypes, review packets, fabrication caveats",
  ],
  [
    "valeria-cruz",
    "valeria-cruz",
    "International real-estate operations; Panama-first market intelligence, buyer trust, software/product execution, lead-generation systems",
  ],
  [
    "wren-ashford",
    "wren-ashford",
    "Product/UI creative direction; UX critique, design contracts, implementation handoffs, visual acceptance",
  ],
  [
    "xander",
    "xander",
    "Otoxan controller/fleet operator; control-plane buildout, fleet operations, internal agent runtime coordination",
  ],
];

test("curated homepage fleet includes the expected public agents in order", () => {
  assert.deepEqual(
    curatedHomepageFleet.map(agent => [agent.slug, agent.label, agent.description]),
    expectedFleet
  );
  assert.equal(
    curatedHomepageFleet.some(agent => agent.label === "default / silas"),
    false
  );
  assert.ok(curatedHomepageFleet.every(agent => agent.status === "verified"));
});

test("curated homepage fleet excludes non-public and temporarily omitted profiles", () => {
  const slugsAndLabels = curatedHomepageFleet.flatMap(agent => [
    agent.slug,
    agent.label,
    agent.description,
  ]);

  for (const omitted of [
    "vinnie-santoro",
    "fixture-agent-v1",
    "World Cup betting analysis",
  ]) {
    assert.equal(slugsAndLabels.some(value => value.includes(omitted)), false);
    assert.equal(homepageSource.includes(omitted), false);
  }
});

test("displayed homepage fleet count stays aligned with curated data length", () => {
  assert.equal(curatedHomepageFleet.length, 9);
  assert.equal(getHomepageFleetCountLabel(), "9 verified agents");
  assert.match(
    homepageSource,
    /getHomepageFleetCountLabel\(curatedHomepageFleet\)/
  );
  assert.doesNotMatch(homepageSource, />8 verified agents</);
});

test("homepage renders fleet rows from the shared data structure without repeated hard-coded rows", () => {
  assert.match(homepageSource, /curatedHomepageFleet\.map\(agent =>/);
  assert.match(homepageSource, /data-agent=\{agent\.slug\}/);
  assert.match(homepageSource, /<span>\{agent\.label\}<\/span>/);
  assert.match(homepageSource, /<b>\{agent\.description\}<\/b>/);
});

console.log(`PASS ${passed} FAIL ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
