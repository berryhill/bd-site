/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { BlogStoreValidationError } from "../src/content/blogStore.ts";
import { FilesystemBlogStore } from "../src/content/filesystemBlogStore.ts";
import {
  assertCanonicalBlogSlug,
  resolveCreatePubDatetime,
} from "../src/content/blogSchema.ts";
import { runBlogStoreContract } from "./blogStore.sharedContract.mjs";

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

async function withFilesystemStore(fn) {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "bd-blog-store-"));
  const createStore = () => new FilesystemBlogStore({ baseDir });
  try {
    await fn(createStore(), createStore, { baseDir });
  } finally {
    await fs.rm(baseDir, { recursive: true, force: true });
  }
}

const source = value => new TextEncoder().encode(value);
const text = value => new TextDecoder().decode(value);

await test("create retries reuse a generated publication timestamp", async () => {
  const generated = "2026-08-24T00:00:00.000Z";
  assert.equal(
    resolveCreatePubDatetime(undefined, undefined, () => generated),
    generated
  );
  assert.equal(
    resolveCreatePubDatetime(undefined, generated, () => "later"),
    generated
  );
  assert.equal(
    resolveCreatePubDatetime("2026-08-25T00:00:00.000Z", generated),
    "2026-08-25T00:00:00.000Z"
  );
});

await test("strict slug validation rejects unsafe and noncanonical identities", async () => {
  for (const slug of [
    "../post",
    "post/name",
    "post%2fname",
    "post%5Cname",
    "post\\name",
    "post\u0000name",
    "Post-Name",
    "post--name",
    "post.md",
  ]) {
    assert.throws(() => assertCanonicalBlogSlug(slug), BlogStoreValidationError);
  }
  assert.equal(assertCanonicalBlogSlug("post-name-2"), "post-name-2");
});

runBlogStoreContract({
  test,
  provider: "filesystem",
  withStore: withFilesystemStore,
});

await test("filesystem rejects invalid UTF-8 before creating a post file", async () => {
  await withFilesystemStore(async (store, _createStore, { baseDir }) => {
    await assert.rejects(
      store.putPost("invalid-source", new Uint8Array([0xc3, 0x28]), {
        expectedRevision: "absent",
        operationId: "create-invalid-source",
      }),
      BlogStoreValidationError
    );
    await assert.rejects(fs.access(path.join(baseDir, "invalid-source.md")));
  });
});

await test("failed filesystem atomic replacement preserves previous bytes", async () => {
  await withFilesystemStore(async (store, _createStore, { baseDir }) => {
    const created = await store.putPost("atomic-post", source("one"), {
      expectedRevision: "absent",
      operationId: "create-atomic",
    });
    const originalRename = fs.rename;
    fs.rename = async (from, to) => {
      if (String(to).endsWith("atomic-post.md")) {
        const error = new Error("injected rename failure");
        error.code = "EIO";
        throw error;
      }
      return originalRename(from, to);
    };
    try {
      await assert.rejects(
        store.putPost("atomic-post", source("two"), {
          expectedRevision: created.revision,
          operationId: "update-atomic",
        }),
        /Failed to write post/
      );
    } finally {
      fs.rename = originalRename;
    }

    assert.equal(text((await store.getPost("atomic-post")).source), "one");
    assert.equal(
      (await fs.readdir(baseDir)).some(name => name.endsWith(".tmp")),
      false
    );
  });
});

await test("filesystem listing ignores private markdown and metadata", async () => {
  await withFilesystemStore(async (store, _createStore, { baseDir }) => {
    await store.putPost("public-post", source("public"), {
      expectedRevision: "absent",
      operationId: "create-public",
    });
    await fs.writeFile(path.join(baseDir, "_private.md"), "private");

    assert.deepEqual(
      (await store.listPosts()).map(post => post.slug),
      ["public-post"]
    );
  });
});

console.log(`PASS ${passed} FAIL ${failed}`);
if (failed > 0) process.exitCode = 1;
