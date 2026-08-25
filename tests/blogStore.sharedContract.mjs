import assert from "node:assert/strict";
import {
  BlogStoreConflictError,
  BlogStoreNotFoundError,
  BlogStoreValidationError,
} from "../src/content/blogStore.ts";

const source = value => new TextEncoder().encode(value);
const text = value => new TextDecoder().decode(value);

export function runBlogStoreContract({ test, provider, withStore }) {
  const contractTest = (name, fn) => test(`${provider}: ${name}`, fn);

  contractTest("create is exclusive and preserves exact source bytes", async () => {
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

  contractTest("invalid UTF-8 is rejected", async () => {
    await withStore(async store => {
      await assert.rejects(
        store.putPost("invalid-source", new Uint8Array([0xc3, 0x28]), {
          expectedRevision: "absent",
          operationId: "create-invalid-source",
        }),
        BlogStoreValidationError
      );
      assert.equal(await store.getPost("invalid-source"), null);
    });
  });

  contractTest("updates prevent lost writes and operation retries are idempotent", async () => {
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

  contractTest("separate store instances serialize compare-and-swap updates", async () => {
    await withStore(async (firstStore, createStore) => {
      const secondStore = createStore();
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
      assert.ok(results.find(result => result.status === "rejected").reason instanceof BlogStoreConflictError);
    });
  });

  contractTest("delete is revision-aware and idempotent for the same operation", async () => {
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

  contractTest("snapshots remain stable after later writes", async () => {
    await withStore(async store => {
      await store.putPost("first-post", source("first"), {
        expectedRevision: "absent",
        operationId: "create-first",
      });
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
}
