/* eslint-disable no-console */
import assert from "node:assert/strict";
import {
  findDynamicPostOgImagePost,
  renderDynamicPostOgImageEndpoint,
} from "../src/utils/dynamicPostOgImageEndpoint.ts";

let passed = 0;
let failed = 0;
const pending = [];

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === "function") {
      pending.push(
        result
          .then(() => {
            passed += 1;
          })
          .catch(error => {
            failed += 1;
            console.error(`FAIL ${name}`);
            console.error(error);
          })
      );
      return;
    }
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(error);
  }
}

function makePngHeader(width = 1200, height = 630) {
  const png = new Uint8Array(33);
  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  png.set([0x00, 0x00, 0x00, 0x0d], 8);
  png.set([0x49, 0x48, 0x44, 0x52], 12);
  const view = new DataView(png.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  png.set([0x08, 0x06, 0x00, 0x00, 0x00], 24);
  return png;
}

function readPngDimensions(bytes) {
  assert.deepEqual(Array.from(bytes.slice(0, 8)), [
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert.equal(String.fromCharCode(...bytes.slice(12, 16)), "IHDR");
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
  };
}

const posts = [
  {
    id: "judge-ai-by-the-decisions-it-improves",
    filePath: "src/data/blog/judge-ai-by-the-decisions-it-improves.md",
    data: { title: "Judge AI by the Decisions It Improves" },
  },
  {
    id: "second-representative-post",
    filePath: "src/data/blog/second-representative-post.md",
    data: { title: "Second Representative Post", ogImage: null },
  },
  {
    id: "draft-post",
    filePath: "src/data/blog/draft-post.md",
    data: { title: "Draft Post", draft: true },
  },
  {
    id: "custom-og-post",
    filePath: "src/data/blog/custom-og-post.md",
    data: { title: "Custom OG Post", ogImage: "/assets/blog/custom-og.png" },
  },
];

test("selects dynamic OG posts by Astro slug identity, not getPath's leading-slash path", () => {
  const slug = "judge-ai-by-the-decisions-it-improves";
  const oldGetPathWithoutBaseShape = `/${slug}`;

  assert.notEqual(oldGetPathWithoutBaseShape, slug);
  assert.equal(findDynamicPostOgImagePost(posts, slug)?.id, slug);
});

test("renders a successful dynamic post OG image response for the main affected slug", async () => {
  let renderedPostId = "";
  const response = await renderDynamicPostOgImageEndpoint({
    posts,
    renderPostOgImage: async post => {
      renderedPostId = post.id;
      return makePngHeader();
    },
    slug: "judge-ai-by-the-decisions-it-improves",
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.equal(
    response.headers.get("cache-control"),
    "public, max-age=31536000, immutable"
  );
  assert.equal(renderedPostId, "judge-ai-by-the-decisions-it-improves");

  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.equal(bytes.byteLength > 0, true);
  assert.deepEqual(readPngDimensions(bytes), { width: 1200, height: 630 });
});

test("renders a second representative post without an explicit ogImage", async () => {
  const response = await renderDynamicPostOgImageEndpoint({
    posts,
    renderPostOgImage: async () => makePngHeader(1200, 630),
    slug: "second-representative-post",
  });

  assert.equal(response.status, 200);
  assert.deepEqual(readPngDimensions(new Uint8Array(await response.arrayBuffer())), {
    width: 1200,
    height: 630,
  });
});

test("returns 404 for unknown, draft, or custom-og slugs", async () => {
  for (const slug of ["missing-post", "draft-post", "custom-og-post"]) {
    const response = await renderDynamicPostOgImageEndpoint({
      posts,
      renderPostOgImage: async () => makePngHeader(),
      slug,
    });

    assert.equal(response.status, 404, slug);
    assert.equal(response.headers.get("cache-control"), "no-store", slug);
  }
});

test("returns 404 when the live collection loader yields no posts", async () => {
  const response = await renderDynamicPostOgImageEndpoint({
    posts: undefined,
    renderPostOgImage: async () => makePngHeader(),
    slug: "judge-ai-by-the-decisions-it-improves",
  });

  assert.equal(response.status, 404);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("returns 500 when OG rendering fails after a matching post is selected", async () => {
  const response = await renderDynamicPostOgImageEndpoint({
    posts,
    renderPostOgImage: async () => {
      throw new Error("satori failed");
    },
    slug: "judge-ai-by-the-decisions-it-improves",
  });

  assert.equal(response.status, 500);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(await response.text(), /OG image render failed/);
});

for (const maybePromise of pending) {
  await maybePromise;
}

console.log(`PASS ${passed} FAIL ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
