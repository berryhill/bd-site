import assert from "node:assert/strict";
import { test } from "node:test";
import { SITE } from "../src/config.ts";
import {
  buildBlogPostingJsonLd,
  buildHomepageJsonLd,
  buildWebSiteJsonLd,
} from "../src/utils/structuredData.ts";
import { buildStaticSitemapXml } from "../src/utils/staticSitemap.ts";
import { GET as getSitemapIndex } from "../src/pages/sitemap.xml.ts";

const homeInput = {
  name: SITE.title,
  url: SITE.website,
  description: SITE.desc,
  author: SITE.author,
  authorUrl: SITE.profile,
};

const postInput = {
  title: "A guest note",
  description: "An independently authored article.",
  url: new URL("posts/guest-note/", SITE.website).href,
  author: "Guest Writer",
  authorUrl: "https://guest.example/",
  pubDatetime: new Date("2026-01-02T03:04:05.000Z"),
};

test("Organization uses the public brand description, monogram, and inquiry contact", () => {
  const [, person, organization] = buildHomepageJsonLd(homeInput);
  assert.deepEqual(organization, {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": new URL("#organization", SITE.website).href,
    name: "Berryhill Dev",
    url: SITE.website,
    description: SITE.desc,
    logo: new URL("favicon.png", SITE.website).href,
    email: "matt@berryhill.dev",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "general inquiries",
      email: "matt@berryhill.dev",
      url: new URL("about/#connect", SITE.website).href,
    },
    founder: { "@id": new URL("about/#person", SITE.website).href },
  });
  assert.notEqual(organization.logo, person.image, "brand monogram is not Matt's headshot");
  assert.deepEqual(person.sameAs, ["https://www.linkedin.com/in/matthew-berryhill/"]);
});

test("homepage, WebSite, and BlogPosting share one Organization publisher", () => {
  const [homeSite, , homeOrganization] = buildHomepageJsonLd(homeInput);
  const site = buildWebSiteJsonLd(homeInput);
  const article = buildBlogPostingJsonLd(postInput);
  const expectedPublisher = { ...homeOrganization };
  delete expectedPublisher["@context"];

  assert.deepEqual(homeSite.publisher, expectedPublisher);
  assert.deepEqual(site.publisher, expectedPublisher);
  assert.deepEqual(article.publisher, expectedPublisher);
  assert.equal(homeSite["@id"], new URL("#website", SITE.website).href);
  assert.equal(article.publisher.founder["@id"], new URL("about/#person", SITE.website).href);
});

test("guest attribution is independent of publisher and no unverified business data is emitted", () => {
  const article = buildBlogPostingJsonLd(postInput);
  assert.deepEqual(article.author, [
    { "@type": "Person", name: "Guest Writer", url: postInput.authorUrl },
  ]);
  assert.equal(article.dateModified, undefined);
  for (const organization of [buildHomepageJsonLd(homeInput)[2], article.publisher]) {
    for (const key of ["sameAs", "telephone", "address", "legalName", "taxID"]) {
      assert.equal(Object.hasOwn(organization, key), false, key);
    }
    for (const key of ["telephone", "contactOption", "areaServed"]) {
      assert.equal(Object.hasOwn(organization.contactPoint, key), false, key);
    }
  }
});

test("static and index sitemaps remain stable without unsourced modification dates", async () => {
  const staticXml = buildStaticSitemapXml({ site: SITE.website, showArchives: SITE.showArchives });
  assert.equal(staticXml, buildStaticSitemapXml({ site: SITE.website, showArchives: SITE.showArchives }));
  assert.match(staticXml, /<loc>https:\/\/berryhill\.dev\/<\/loc>/);
  assert.doesNotMatch(staticXml, /<lastmod>/);

  const response = await getSitemapIndex({});
  assert.equal(response.status, 200);
  const indexXml = await response.text();
  assert.match(indexXml, /<loc>https:\/\/berryhill\.dev\/sitemap-static\.xml<\/loc>/);
  assert.match(indexXml, /<loc>https:\/\/berryhill\.dev\/sitemap-posts\.xml<\/loc>/);
  assert.doesNotMatch(indexXml, /<lastmod>/);
  assert.equal(indexXml, await (await getSitemapIndex({})).text());
});
