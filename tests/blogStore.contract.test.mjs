/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  BlogStoreConflictError,
  BlogStoreNotFoundError,
  BlogStoreValidationError,
} from "../src/content/blogStore.ts";
import { FilesystemBlogStore } from "../src/content/filesystemBlogStore.ts";
import {
  assertCanonicalBlogSlug,
  resolveCreatePubDatetime,
} from "../src/content/blogSchema.ts";

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

async function withStore(fn) {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "bd-blog-store-"));
  try {
    await fn(new FilesystemBlogStore({ baseDir }), baseDir);
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

await test("create is exclusive and preserves exact source bytes", async () => {
  await withStore(async store => {
    const raw = source("---\ntitle: Exact\ncustom: '01'\n---\nBody  \n");
    const created = await store.putPost("exact-post", raw, {
      expectedRevision: "absent",
      operationId: "create-exact",
    });

    assert.deepEqual(created.source, raw);
    assert.equal(text(created.source), text(raw));
    await assert.rejects(
      store.putPost("exact-post", source("replacement"), {
        expectedRevision: "absent",
        operationId: "duplicate-create",
      }),
      BlogStoreConflictError
    );
    assert.deepEqual((await store.getPost("exact-post")).source, raw);
  });
});

await test("invalid UTF-8 is rejected before it can poison storage", async () => {
  await withStore(async (store, baseDir) => {
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

await test("updates prevent lost writes and operation retries are idempotent", async () => {
  await withStore(async store => {
    const created = await store.putPost("revision-post", source("one"), {
      expectedRevision: "absent",
      operationId: "create-revision",
    });
    const updated = await store.putPost("revision-post", source("two"), {
      expectedRevision: created.revision,
      operationId: "update-revision",
    });
    const retried = await store.putPost("revision-post", source("two"), {
      expectedRevision: created.revision,
      operationId: "update-revision",
    });

    assert.equal(retried.revision, updated.revision);
    await assert.rejects(
      store.putPost("revision-post", source("three"), {
        expectedRevision: created.revision,
        operationId: "stale-update",
      }),
      BlogStoreConflictError
    );
    await assert.rejects(
      store.putPost("revision-post", source("different"), {
        expectedRevision: created.revision,
        operationId: "update-revision",
      }),
      BlogStoreConflictError
    );
    assert.equal(text((await store.getPost("revision-post")).source), "two");
  });
});

await test("separate store instances serialize compare-and-swap updates", async () => {
  await withStore(async (firstStore, baseDir) => {
    const secondStore = new FilesystemBlogStore({ baseDir });
    const created = await firstStore.putPost("shared-post", source("one"), {
      expectedRevision: "absent",
      operationId: "create-shared",
    });

    const results = await Promise.allSettled([
      firstStore.putPost("shared-post", source("two"), {
        expectedRevision: created.revision,
        operationId: "update-shared-first",
      }),
      secondStore.putPost("shared-post", source("three"), {
        expectedRevision: created.revision,
        operationId: "update-shared-second",
      }),
    ]);

    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(results.filter(result => result.status === "rejected").length, 1);
  });
});

await test("failed atomic replacement preserves the previous post bytes", async () => {
  await withStore(async (store, baseDir) => {
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

await test("delete is revision-aware and idempotent for the same operation", async () => {
  await withStore(async store => {
    const created = await store.putPost("delete-post", source("delete me"), {
      expectedRevision: "absent",
      operationId: "create-delete",
    });

    await assert.rejects(
      store.deletePost("delete-post", {
        expectedRevision: "stale",
        operationId: "stale-delete",
      }),
      BlogStoreConflictError
    );
    await store.deletePost("delete-post", {
      expectedRevision: created.revision,
      operationId: "delete-post",
    });
    await store.deletePost("delete-post", {
      expectedRevision: created.revision,
      operationId: "delete-post",
    });
    assert.equal(await store.getPost("delete-post"), null);
    await assert.rejects(
      store.deletePost("delete-post", {
        expectedRevision: created.revision,
        operationId: "another-delete",
      }),
      BlogStoreNotFoundError
    );
  });
});

await test("snapshots are stable and listing ignores private markdown and metadata", async () => {
  await withStore(async (store, baseDir) => {
    await store.putPost("first-post", source("first"), {
      expectedRevision: "absent",
      operationId: "create-first",
    });
    await fs.writeFile(path.join(baseDir, "_private.md"), "private");
    const snapshot = await store.snapshot();
    await store.putPost("second-post", source("second"), {
      expectedRevision: "absent",
      operationId: "create-second",
    });

    assert.deepEqual(
      (await store.listPosts(snapshot)).map(post => post.slug),
      ["first-post"]
    );
    assert.deepEqual(
      (await store.listPosts()).map(post => post.slug),
      ["first-post", "second-post"]
    );
  });
});

console.log(`PASS ${passed} FAIL ${failed}`);
if (failed > 0) process.exitCode = 1;
