/* eslint-disable no-console */
import assert from "node:assert/strict";
import { verifyPublicContentSurfaces } from "../src/content/contentPublicSurfaceVerification.ts";

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(error);
  }
}

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const html = (canonical, content) =>
  `<!doctype html><html><head><link rel="canonical" href="${canonical}"></head><body>${content}</body></html>`;

function response(body, status = 200, contentType = "text/html; charset=utf-8") {
  return new Response(body, { status, headers: { "content-type": contentType } });
}

function fixtureFetch(overrides = {}) {
  const postNewest = "https://example.test/posts/newest/";
  const postOlder = "https://example.test/posts/older/";
  const sourceOnlyPosts = ["draft-post", "scheduled-post", "private-post"];
  const responses = {
    "/": response(
      html(
        "https://example.test/",
        `<a href="/posts/newest/">Newest</a><a href="/posts/older/">Older</a>`
      )
    ),
    "/posts/": response(
      html(
        "https://example.test/posts/",
        `<a href="/posts/newest/">Newest</a><a href="/posts/older/">Older</a>`
      )
    ),
    "/tags/": response(
      html(
        "https://example.test/tags/",
        '<a href="/tags/migration/">migration</a>'
      )
    ),
    "/archives/": response("Not found", 404),
    "/rss.xml": response(
      `<rss><channel><item><link>${postNewest}</link></item><item><link>${postOlder}</link></item></channel></rss>`,
      200,
      "application/rss+xml"
    ),
    "/atom.xml": response(
      `<feed><entry><link href="${postNewest}"/></entry><entry><link href="${postOlder}"/></entry></feed>`,
      200,
      "application/atom+xml"
    ),
    "/sitemap-posts.xml": response(
      `<urlset><url><loc>${postNewest}</loc></url><url><loc>${postOlder}</loc></url></urlset>`,
      200,
      "application/xml"
    ),
    "/llms.txt": response(
      `- [Newest](${postNewest})\n- [Older](${postOlder})`,
      200,
      "text/plain"
    ),
    "/posts/newest/": response(html(postNewest, "Newest post")),
    "/tags/migration/": response(
      html(
        "https://example.test/tags/migration/",
        '<a href="/posts/newest/">Newest</a>'
      )
    ),
    "/posts/newest/index.png": response(png, 200, "image/png"),
    "/api/posts": response(
      JSON.stringify({
        posts: ["newest", "older", ...sourceOnlyPosts].map(slug => ({ slug })),
      }),
      200,
      "application/json"
    ),
    ...overrides,
  };
  return async url => {
    const route = new URL(url).pathname;
    const found = responses[route];
    if (!found) throw new Error(`Unexpected route: ${route}`);
    return found.clone();
  };
}

const verificationInput = {
  origin: new URL("https://example.test/"),
  apiKey: "test-placeholder-not-a-real-secret",
  sourceSlugs: [
    "newest",
    "older",
    "draft-post",
    "scheduled-post",
    "private-post",
  ],
  publicOrder: ["newest", "older"],
  representativeSlug: "newest",
  representativeOgSlug: "newest",
  representativeTag: "migration",
};

await test(
  "public verification proves inventory, content, ordering, canonicals, and media types",
  async () => {
    const result = await verifyPublicContentSurfaces({
      ...verificationInput,
      fetchImpl: fixtureFetch(),
    });

    assert.equal(result.every(surface => surface.ok), true);
    assert.equal(
      result.find(surface => surface.name === "posts").checks.publicOrder,
      true
    );
    assert.equal(
      result.find(surface => surface.name === "detail").checks.canonical,
      true
    );
    assert.equal(
      result.find(surface => surface.name === "rss").checks.inventory,
      true
    );
    assert.equal(
      result.find(surface => surface.name === "og-eligibility").checks.pngSignature,
      true
    );
    assert.equal(
      result.find(surface => surface.name === "api-inventory").checks.inventory,
      true
    );
  }
);

await test(
  "public verification fails closed when a 200 surface omits required content",
  async () => {
    const result = await verifyPublicContentSurfaces({
      ...verificationInput,
      fetchImpl: fixtureFetch({
        "/posts/": response(
          html("https://example.test/posts/", "No post inventory")
        ),
        "/posts/newest/index.png": response("not a png", 200, "image/png"),
      }),
    });

    const posts = result.find(surface => surface.name === "posts");
    const og = result.find(surface => surface.name === "og-eligibility");
    assert.equal(posts.ok, false);
    assert.equal(posts.checks.inventory, false);
    assert.equal(og.ok, false);
    assert.equal(og.checks.pngSignature, false);
  }
);

await test(
  "public verification rejects source-only post leakage on every public inventory surface",
  async () => {
    const cases = [
      {
        name: "homepage",
        route: "/",
        leakedSlug: "draft-post",
        body: html(
          "https://example.test/",
          '<a href="/posts/newest/">Newest</a><a href="/posts/draft-post/">Draft</a><a href="/posts/older/">Older</a>'
        ),
      },
      {
        name: "posts",
        route: "/posts/",
        leakedSlug: "scheduled-post",
        body: html(
          "https://example.test/posts/",
          '<a href="/posts/newest/">Newest</a><a href="/posts/scheduled-post/">Scheduled</a><a href="/posts/older/">Older</a>'
        ),
      },
      {
        name: "rss",
        route: "/rss.xml",
        leakedSlug: "private-post",
        body: '<rss><channel><item><link>https://example.test/posts/newest/</link></item><item><link>https://example.test/posts/private-post/</link></item><item><link>https://example.test/posts/older/</link></item></channel></rss>',
        contentType: "application/rss+xml",
      },
      {
        name: "atom",
        route: "/atom.xml",
        leakedSlug: "draft-post",
        body: '<feed><entry><link href="https://example.test/posts/newest/"/></entry><entry><link href="https://example.test/posts/draft-post/"/></entry><entry><link href="https://example.test/posts/older/"/></entry></feed>',
        contentType: "application/atom+xml",
      },
      {
        name: "sitemap-posts",
        route: "/sitemap-posts.xml",
        leakedSlug: "scheduled-post",
        body: '<urlset><url><loc>https://example.test/posts/newest/</loc></url><url><loc>https://example.test/posts/scheduled-post/</loc></url><url><loc>https://example.test/posts/older/</loc></url></urlset>',
        contentType: "application/xml",
      },
      {
        name: "llms",
        route: "/llms.txt",
        leakedSlug: "private-post",
        body: '- [Newest](https://example.test/posts/newest/)\n- [Private](https://example.test/posts/private-post/)\n- [Older](https://example.test/posts/older/)',
        contentType: "text/plain",
      },
      {
        name: "tag-detail",
        route: "/tags/migration/",
        leakedSlug: "draft-post",
        body: html(
          "https://example.test/tags/migration/",
          '<a href="/posts/newest/">Newest</a><a href="/posts/draft-post/">Draft</a>'
        ),
      },
    ];

    for (const testCase of cases) {
      const result = await verifyPublicContentSurfaces({
        ...verificationInput,
        fetchImpl: fixtureFetch({
          [testCase.route]: response(
            testCase.body,
            200,
            testCase.contentType ?? "text/html; charset=utf-8"
          ),
        }),
      });
      const surface = result.find(item => item.name === testCase.name);
      const api = result.find(item => item.name === "api-inventory");

      assert.equal(
        surface.checks.noPrivatePosts,
        false,
        `${testCase.name} accepted leaked source-only slug ${testCase.leakedSlug}`
      );
      assert.equal(surface.ok, false);
      assert.equal(api.checks.inventory, true);
      assert.equal(api.ok, true);
    }
  }
);

console.log(
  `content public-surface verification: ${passed} passed, ${failed} failed`
);
if (failed > 0) process.exitCode = 1;
