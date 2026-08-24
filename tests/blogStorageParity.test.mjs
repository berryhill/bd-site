/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readFileSync } from "node:fs";
import { FilesystemBlogStore } from "../src/content/filesystemBlogStore.ts";
import { blogLiveLoader } from "../src/content/blogLiveLoader.ts";
import {
  requireLiveBlogEntries,
  storageUnavailableResponse,
} from "../src/content/publicBlogReads.ts";
import { resolveUpdateModDatetime } from "../src/content/blogMutation.ts";

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

async function fixture() {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "bd-blog-parity-"));
  const publicDir = await fs.mkdtemp(path.join(os.tmpdir(), "bd-blog-public-"));
  const store = new FilesystemBlogStore({ baseDir });
  const put = (slug, markdown, operationId) =>
    store.putPost(slug, new TextEncoder().encode(markdown), {
      expectedRevision: "absent",
      operationId,
    });
  return { baseDir, publicDir, store, put };
}

await test("store-backed live loader preserves frontmatter, body, filters, and exact IDs", async () => {
  const context = await fixture();
  try {
    await context.put(
      "public-post",
      "---\ntitle: Public\ndescription: Desc\npubDatetime: 2026-01-02T00:00:00Z\ndraft: false\ntags: [one]\ncustomField: preserved\n---\nBody  \n",
      "create-public"
    );
    await context.put(
      "draft-post",
      "---\ntitle: Draft\ndescription: Desc\npubDatetime: 2026-01-01T00:00:00Z\ndraft: true\n---\nDraft body\n",
      "create-draft"
    );
    const loader = blogLiveLoader({
      store: context.store,
      publicDir: context.publicDir,
    });

    const all = await loader.loadCollection();
    assert.deepEqual(
      all.entries.map(entry => entry.id),
      ["draft-post", "public-post"]
    );
    const filtered = await loader.loadCollection({ filter: { draft: false } });
    assert.deepEqual(filtered.entries.map(entry => entry.id), ["public-post"]);
    assert.equal(filtered.entries[0].data.customField, "preserved");
    assert.equal(filtered.entries[0].body, "Body  \n");
    assert.equal(filtered.entries[0].filePath, "public-post.md");
    const single = await loader.loadEntry({ filter: "public-post" });
    assert.equal(single.id, "public-post");
  } finally {
    await fs.rm(context.baseDir, { recursive: true, force: true });
    await fs.rm(context.publicDir, { recursive: true, force: true });
  }
});

await test("storage and invalid UTF-8 failures are surfaced instead of becoming empty collections", async () => {
  const missing = new FilesystemBlogStore({ baseDir: path.join(os.tmpdir(), "missing-blog-store") });
  const missingLoader = blogLiveLoader({ store: missing, publicDir: os.tmpdir() });
  await assert.rejects(missingLoader.loadCollection(), /Failed to list blog posts/);

  const context = await fixture();
  try {
    await fs.writeFile(
      path.join(context.baseDir, "invalid-source.md"),
      new Uint8Array([0xc3, 0x28])
    );
    const loader = blogLiveLoader({ store: context.store, publicDir: context.publicDir });
    await assert.rejects(loader.loadCollection(), /valid UTF-8/);
  } finally {
    await fs.rm(context.baseDir, { recursive: true, force: true });
    await fs.rm(context.publicDir, { recursive: true, force: true });
  }
});

await test("live collection and posts API are wired through the shared BlogStore", async () => {
  const liveConfig = readFileSync(new URL("../src/live.config.ts", import.meta.url), "utf8");
  const api = readFileSync(new URL("../src/pages/api/posts.ts", import.meta.url), "utf8");
  assert.match(liveConfig, /blogLiveLoader/);
  assert.doesNotMatch(liveConfig, /filesystemLoader/);
  assert.match(api, /getBlogStore/);
  assert.doesNotMatch(api, /from ["']fs\/promises["']/);
});

await test("public live reads fail closed and expose a controlled unavailable response", async () => {
  const storageFailure = new Error("injected storage failure");
  assert.throws(
    () => requireLiveBlogEntries({ error: storageFailure }),
    error => error?.code === "BLOG_STORE_UNAVAILABLE"
  );

  const response = storageUnavailableResponse();
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("retry-after"), "30");
  assert.match(await response.text(), /Blog storage is temporarily unavailable/);
});

await test("every public blog consumer uses the fail-closed read boundary", async () => {
  const consumers = [
    "../src/pages/index.astro",
    "../src/pages/posts/index.astro",
    "../src/pages/posts/page/[page].astro",
    "../src/pages/posts/[slug]/index.astro",
    "../src/pages/tags/index.astro",
    "../src/pages/tags/[tag]/[...page].astro",
    "../src/pages/rss.xml.ts",
    "../src/pages/atom.xml.ts",
    "../src/pages/sitemap-posts.xml.ts",
    "../src/pages/llms.txt.ts",
    "../src/pages/posts/[slug]/index.png.ts",
  ];

  for (const consumer of consumers) {
    const source = readFileSync(new URL(consumer, import.meta.url), "utf8");
    assert.match(source, /getLiveBlogPosts/, consumer);
    assert.doesNotMatch(source, /getLiveCollection|getLiveEntry/, consumer);
  }

  const middleware = readFileSync(
    new URL("../src/middleware.ts", import.meta.url),
    "utf8"
  );
  assert.match(middleware, /storageUnavailableResponse/);
});

await test("PATCH retries retain the committed generated modDatetime", async () => {
  const generated = "2026-08-24T12:00:00.000Z";
  assert.equal(
    resolveUpdateModDatetime({
      currentModDatetime: undefined,
      currentRevision: "revision-one",
      expectedRevision: "revision-one",
      now: () => generated,
    }),
    generated
  );
  assert.equal(
    resolveUpdateModDatetime({
      currentModDatetime: generated,
      currentRevision: "revision-two",
      expectedRevision: "revision-one",
      now: () => "2026-08-24T12:01:00.000Z",
    }),
    generated
  );
  assert.equal(
    resolveUpdateModDatetime({
      providedModDatetime: null,
      currentModDatetime: generated,
      currentRevision: "revision-two",
      expectedRevision: "revision-one",
    }),
    null
  );
});

console.log(`PASS ${passed} FAIL ${failed}`);
if (failed > 0) process.exitCode = 1;
