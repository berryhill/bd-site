/* eslint-disable no-console */
import assert from "node:assert/strict";
import { SITE } from "../src/config.ts";
import {
  buildBlogPostingJsonLd,
  buildCollectionPageJsonLd,
  buildPersonJsonLd,
  buildWebSiteJsonLd,
} from "../src/utils/structuredData.ts";

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

function containsUndefined(value) {
  if (value === undefined) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.some(containsUndefined);
  }

  if (value && typeof value === "object") {
    return Object.values(value).some(containsUndefined);
  }

  return false;
}

test("BlogPosting includes enriched post schema fields", () => {
  const jsonLd = buildBlogPostingJsonLd({
    title: "Agentic Workflows",
    description: "A practical note on agentic workflows.",
    url: "https://berryhill.dev/posts/agentic-workflows/",
    image: "https://berryhill.dev/posts/agentic-workflows/index.png",
    author: "Berryhill",
    authorUrl: "https://berryhill.dev/",
    pubDatetime: new Date("2026-01-02T03:04:05.000Z"),
    modDatetime: new Date("2026-01-03T04:05:06.000Z"),
    tags: ["AI", "Agentic Development"],
  });

  assert.equal(jsonLd["@type"], "BlogPosting");
  assert.equal(jsonLd.headline, "Agentic Workflows");
  assert.equal(jsonLd.description, "A practical note on agentic workflows.");
  assert.equal(jsonLd.url, "https://berryhill.dev/posts/agentic-workflows/");
  assert.deepEqual(jsonLd.mainEntityOfPage, {
    "@type": "WebPage",
    "@id": "https://berryhill.dev/posts/agentic-workflows/",
  });
  assert.deepEqual(jsonLd.image, [
    "https://berryhill.dev/posts/agentic-workflows/index.png",
  ]);
  assert.equal(jsonLd.datePublished, "2026-01-02T03:04:05.000Z");
  assert.equal(jsonLd.dateModified, "2026-01-03T04:05:06.000Z");
  assert.deepEqual(jsonLd.keywords, ["AI", "Agentic Development"]);
  assert.deepEqual(jsonLd.author, [
    {
      "@type": "Person",
      "@id": "https://berryhill.dev/about/#person",
      name: "Berryhill",
      url: "https://berryhill.dev/about/",
      sameAs: ["https://www.linkedin.com/in/matthew-berryhill/"],
    },
  ]);
  assert.deepEqual(jsonLd.publisher, {
    "@type": "Organization",
    "@id": "https://berryhill.dev/#organization",
    name: "Berryhill Dev",
    url: "https://berryhill.dev/",
    description: SITE.desc,
    logo: "https://berryhill.dev/favicon.png",
    email: "matt@berryhill.dev",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "general inquiries",
      email: "matt@berryhill.dev",
      url: "https://berryhill.dev/about/#connect",
    },
    founder: { "@id": "https://berryhill.dev/about/#person" },
  });
});

test("BlogPosting omits dateModified when absent and never contains undefined values", () => {
  const withNullDate = buildBlogPostingJsonLd({
    title: "Agentic Workflows",
    description: "A practical note on agentic workflows.",
    url: "https://berryhill.dev/posts/agentic-workflows/",
    author: "Berryhill",
    pubDatetime: new Date("2026-01-02T03:04:05.000Z"),
    modDatetime: null,
  });

  const withUndefinedDate = buildBlogPostingJsonLd({
    title: "Agentic Workflows",
    description: "A practical note on agentic workflows.",
    url: "https://berryhill.dev/posts/agentic-workflows/",
    author: "Berryhill",
    pubDatetime: new Date("2026-01-02T03:04:05.000Z"),
  });

  assert.equal("dateModified" in withNullDate, false);
  assert.equal("dateModified" in withUndefinedDate, false);
  assert.equal(containsUndefined(withNullDate), false);
  assert.equal(containsUndefined(withUndefinedDate), false);
});

test("WebSite produces expected type and required fields", () => {
  const jsonLd = buildWebSiteJsonLd({
    name: "berryhill.dev",
    url: "https://berryhill.dev/",
    description: "Exploring agentic-first development.",
    author: "Berryhill",
    authorUrl: "https://berryhill.dev/",
  });

  assert.equal(jsonLd["@type"], "WebSite");
  assert.equal(jsonLd.name, "berryhill.dev");
  assert.equal(jsonLd.url, "https://berryhill.dev/");
  assert.equal(jsonLd.description, "Exploring agentic-first development.");
  assert.equal(jsonLd.author.name, "Berryhill");
});

test("Person produces expected type and required fields", () => {
  const jsonLd = buildPersonJsonLd({
    name: "Berryhill",
    url: "https://berryhill.dev/",
    image: "https://berryhill.dev/matt_headshot.jpeg",
    description: "Agentic-first digital builder.",
  });

  assert.equal(jsonLd["@type"], "Person");
  assert.equal(jsonLd.name, "Berryhill");
  assert.equal(jsonLd.url, "https://berryhill.dev/");
  assert.equal(jsonLd.image, "https://berryhill.dev/matt_headshot.jpeg");
  assert.equal(jsonLd.description, "Agentic-first digital builder.");
});

test("CollectionPage produces expected type and required fields", () => {
  const jsonLd = buildCollectionPageJsonLd({
    title: "Posts | berryhill.dev",
    description: "All the articles I've posted.",
    url: "https://berryhill.dev/posts/page/2",
    isPartOf: "berryhill.dev",
  });

  assert.equal(jsonLd["@type"], "CollectionPage");
  assert.equal(jsonLd.name, "Posts | berryhill.dev");
  assert.equal(jsonLd.description, "All the articles I've posted.");
  assert.equal(jsonLd.url, "https://berryhill.dev/posts/page/2");
  assert.deepEqual(jsonLd.isPartOf, {
    "@type": "WebSite",
    name: "berryhill.dev",
  });
});

console.log(`PASS ${passed} FAIL ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
