/* eslint-disable no-console */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  BlogStoreReplicationPendingError,
  BlogStoreUnavailableError,
} from "../src/content/blogStore.ts";
import { FilesystemBlogStore } from "../src/content/filesystemBlogStore.ts";
import {
  FilesystemMirrorEvidenceJournal,
  MirrorBlogStore,
} from "../src/content/mirrorBlogStore.ts";

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

const markdown = title =>
  new TextEncoder().encode(
    `---\ntitle: ${title}\ndescription: Test\npubDatetime: 2026-01-01T00:00:00Z\n---\nBody  \n`
  );

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bd-mirror-"));
  const primary = new FilesystemBlogStore({ baseDir: path.join(root, "primary") });
  const secondaryStore = new FilesystemBlogStore({ baseDir: path.join(root, "secondary") });
  await fs.mkdir(path.join(root, "primary"));
  await fs.mkdir(path.join(root, "secondary"));
  const journal = new FilesystemMirrorEvidenceJournal(path.join(root, "evidence"));
  return { root, primary, secondaryStore, journal };
}

await test("mirror reads only the declared primary and never merges inventories", async () => {
  const context = await fixture();
  try {
    await context.secondaryStore.putPost("secondary-only", markdown("Secondary"), {
      expectedRevision: "absent",
      operationId: "secondary-create",
    });
    const mirror = new MirrorBlogStore(
      context.primary,
      context.secondaryStore,
      "filesystem",
      context.journal
    );
    assert.equal(await mirror.getPost("secondary-only"), null);
    assert.deepEqual(await mirror.listPosts(), []);
  } finally {
    await fs.rm(context.root, { recursive: true, force: true });
  }
});

await test("a committed primary write records pending evidence and retries idempotently", async () => {
  const context = await fixture();
  let failReplication = true;
  const secondary = new Proxy(context.secondaryStore, {
    get(target, property) {
      if (property === "putPost") {
        return async (...args) => {
          if (failReplication) {
            throw new BlogStoreUnavailableError("injected secondary outage");
          }
          return target.putPost(...args);
        };
      }
      const value = target[property];
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  const mirror = new MirrorBlogStore(
    context.primary,
    secondary,
    "filesystem",
    context.journal
  );
  const source = markdown("Pending");
  try {
    await assert.rejects(
      mirror.putPost("pending", source, {
        expectedRevision: "absent",
        operationId: "mirror-pending",
      }),
      BlogStoreReplicationPendingError
    );
    const authority = await context.primary.getPost("pending");
    assert.ok(authority);
    assert.equal((await context.journal.read("mirror-pending")).state, "replication-pending");

    failReplication = false;
    const retried = await mirror.putPost("pending", source, {
      expectedRevision: "absent",
      operationId: "mirror-pending",
    });
    assert.equal(retried.revision, authority.revision);
    assert.equal((await context.journal.read("mirror-pending")).state, "complete");
    assert.equal((await context.secondaryStore.getPost("pending")).sha256, authority.sha256);

    const evidence = await fs.readFile(
      path.join(
        context.root,
        "evidence",
        (await fs.readdir(path.join(context.root, "evidence")))[0]
      ),
      "utf8"
    );
    assert.doesNotMatch(evidence, /Body/);
  } finally {
    await fs.rm(context.root, { recursive: true, force: true });
  }
});

await test("mirror delete retries complete after secondary recovery", async () => {
  const context = await fixture();
  try {
    const primaryPost = await context.primary.putPost("remove", markdown("Remove"), {
      expectedRevision: "absent",
      operationId: "primary-remove-create",
    });
    await context.secondaryStore.putPost("remove", markdown("Remove"), {
      expectedRevision: "absent",
      operationId: "secondary-remove-create",
    });
    let failReplication = true;
    const secondary = new Proxy(context.secondaryStore, {
      get(target, property) {
        if (property === "deletePost") {
          return async (...args) => {
            if (failReplication) throw new BlogStoreUnavailableError("injected");
            return target.deletePost(...args);
          };
        }
        const value = target[property];
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const mirror = new MirrorBlogStore(
      context.primary,
      secondary,
      "filesystem",
      context.journal
    );
    await assert.rejects(
      mirror.deletePost("remove", {
        expectedRevision: primaryPost.revision,
        operationId: "mirror-delete",
      }),
      BlogStoreReplicationPendingError
    );
    assert.equal(await context.primary.getPost("remove"), null);
    failReplication = false;
    await mirror.deletePost("remove", {
      expectedRevision: primaryPost.revision,
      operationId: "mirror-delete",
    });
    assert.equal(await context.secondaryStore.getPost("remove"), null);
  } finally {
    await fs.rm(context.root, { recursive: true, force: true });
  }
});

await test("put retry recovers when primary committed before reconciliation evidence", async () => {
  const context = await fixture();
  let writes = 0;
  const interruptedJournal = {
    read: operationId => context.journal.read(operationId),
    async write(record) {
      writes += 1;
      if (writes === 2) {
        throw new BlogStoreUnavailableError("injected journal interruption");
      }
      await context.journal.write(record);
    },
  };
  const mirror = new MirrorBlogStore(
    context.primary,
    context.secondaryStore,
    "filesystem",
    interruptedJournal
  );
  const source = markdown("Interrupted put");
  try {
    await assert.rejects(
      mirror.putPost("interrupted-put", source, {
        expectedRevision: "absent",
        operationId: "interrupted-put-operation",
      }),
      BlogStoreReplicationPendingError
    );
    const committed = await context.primary.getPost("interrupted-put");
    assert.ok(committed);
    assert.equal(
      (await context.journal.read("interrupted-put-operation")).state,
      "prepared"
    );

    const retried = await mirror.putPost("interrupted-put", source, {
      expectedRevision: "absent",
      operationId: "interrupted-put-operation",
    });
    assert.equal(retried.revision, committed.revision);
    assert.equal(
      (await context.secondaryStore.getPost("interrupted-put")).sha256,
      committed.sha256
    );
    assert.equal(
      (await context.journal.read("interrupted-put-operation")).state,
      "complete"
    );
  } finally {
    await fs.rm(context.root, { recursive: true, force: true });
  }
});

await test("delete retry recovers when primary committed before reconciliation evidence", async () => {
  const context = await fixture();
  try {
    const primaryPost = await context.primary.putPost(
      "interrupted-delete",
      markdown("Interrupted delete"),
      {
        expectedRevision: "absent",
        operationId: "interrupted-delete-primary-create",
      }
    );
    await context.secondaryStore.putPost(
      "interrupted-delete",
      markdown("Interrupted delete"),
      {
        expectedRevision: "absent",
        operationId: "interrupted-delete-secondary-create",
      }
    );
    let writes = 0;
    const interruptedJournal = {
      read: operationId => context.journal.read(operationId),
      async write(record) {
        writes += 1;
        if (writes === 2) {
          throw new BlogStoreUnavailableError("injected journal interruption");
        }
        await context.journal.write(record);
      },
    };
    const mirror = new MirrorBlogStore(
      context.primary,
      context.secondaryStore,
      "filesystem",
      interruptedJournal
    );
    await assert.rejects(
      mirror.deletePost("interrupted-delete", {
        expectedRevision: primaryPost.revision,
        operationId: "interrupted-delete-operation",
      }),
      BlogStoreReplicationPendingError
    );
    assert.equal(await context.primary.getPost("interrupted-delete"), null);
    assert.equal(
      (await context.journal.read("interrupted-delete-operation")).state,
      "prepared"
    );

    await mirror.deletePost("interrupted-delete", {
      expectedRevision: primaryPost.revision,
      operationId: "interrupted-delete-operation",
    });
    assert.equal(await context.secondaryStore.getPost("interrupted-delete"), null);
    assert.equal(
      (await context.journal.read("interrupted-delete-operation")).state,
      "complete"
    );
  } finally {
    await fs.rm(context.root, { recursive: true, force: true });
  }
});

console.log(`PASS ${passed} FAIL ${failed}`);
if (failed > 0) process.exitCode = 1;
