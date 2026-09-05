/* eslint-disable no-console */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  BlogStoreConflictError,
  BlogStoreUnavailableError,
  BlogStoreValidationError,
} from "../src/content/blogStore.ts";
import {
  S3BlogStore,
  objectBlogStoreConfigFromEnv,
} from "../src/content/s3BlogStore.ts";
import { runBlogStoreContract } from "./blogStore.sharedContract.mjs";
import { FakeS3 } from "./helpers/fakeS3.mjs";

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

const bytes = value =>
  typeof value === "string" ? new TextEncoder().encode(value) : value;
const text = value => new TextDecoder().decode(value);
const digest = value => createHash("sha256").update(value).digest("hex");

function storeFor(client, overrides = {}) {
  return new S3BlogStore({
    client,
    bucket: "test-blog",
    prefix: "content",
    cacheTtlMs: 5,
    cacheMaxEntries: 8,
    catalogCasRetries: 128,
    tombstoneRetentionMs: 86_400_000,
    maxSourceBytes: 1024 * 1024,
    ...overrides,
  });
}

function fixture(overrides = {}) {
  const client = new FakeS3();
  const store = storeFor(client, overrides);
  return { client, store };
}

runBlogStoreContract({
  test,
  provider: "s3-compatible object",
  withStore: async fn => {
    const client = new FakeS3();
    const createStore = () => storeFor(client);
    await fn(createStore(), createStore, { client });
  },
});

await test("raw Markdown is immutable, content-addressed, and verified independently of ETag", async () => {
  const { client, store } = fixture();
  const raw = bytes("---\ntitle: Exact\ncustom: '01'\n---\nBody  \n");
  const post = await store.putPost("exact-post", raw, {
    expectedRevision: "absent",
    operationId: "create-exact",
  });
  assert.deepEqual(post.source, raw);
  assert.equal(post.sha256, digest(raw));
  assert.notEqual(post.revision, digest(raw));
  assert.ok(client.objects.has(`content/posts/sha256/${digest(raw)}.md`));
  assert.notEqual(client.objects.get(`content/posts/sha256/${digest(raw)}.md`).etag, digest(raw));
  assert.equal(text((await store.getPost("exact-post")).source), text(raw));
  assert.equal(client.forbiddenListCalls, 0);
});

await test("release revisions prevent stale writes after content returns to an earlier checksum", async () => {
  const { store } = fixture();
  const first = await store.putPost("aba-post", bytes("one"), {
    expectedRevision: "absent",
    operationId: "aba-create",
  });
  const second = await store.putPost("aba-post", bytes("two"), {
    expectedRevision: first.revision,
    operationId: "aba-update-two",
  });
  const third = await store.putPost("aba-post", bytes("one"), {
    expectedRevision: second.revision,
    operationId: "aba-update-one",
  });

  assert.equal(third.sha256, first.sha256);
  assert.notEqual(third.revision, first.revision);
  await assert.rejects(
    store.putPost("aba-post", bytes("stale overwrite"), {
      expectedRevision: first.revision,
      operationId: "aba-stale-update",
    }),
    BlogStoreConflictError
  );
});

await test("100 concurrent creates for one slug commit exactly one release", async () => {
  const { client } = fixture();
  const stores = Array.from({ length: 100 }, () => storeFor(client));
  const results = await Promise.allSettled(
    stores.map((store, index) =>
      store.putPost("one-winner", bytes(`candidate-${index}`), {
        expectedRevision: "absent",
        operationId: `create-${index}`,
      })
    )
  );
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(results.filter(result => result.status === "rejected").length, 99);
  for (const result of results.filter(result => result.status === "rejected")) {
    assert.ok(result.reason instanceof BlogStoreConflictError);
  }
});

await test("CAS retries preserve concurrent different-slug writes and reject stale same-slug updates", async () => {
  const { client, store } = fixture();
  const created = await store.putPost("shared", bytes("one"), {
    expectedRevision: "absent",
    operationId: "create-shared",
  });
  const sameSlug = await Promise.allSettled([
    storeFor(client).putPost("shared", bytes("two"), { expectedRevision: created.revision, operationId: "update-a" }),
    storeFor(client).putPost("shared", bytes("three"), { expectedRevision: created.revision, operationId: "update-b" }),
  ]);
  assert.equal(sameSlug.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(sameSlug.filter(result => result.status === "rejected").length, 1);

  const parallelStores = Array.from({ length: 40 }, () => storeFor(client));
  await Promise.all(
    parallelStores.map((parallelStore, index) =>
      parallelStore.putPost(`parallel-${index}`, bytes(`post-${index}`), {
        expectedRevision: "absent",
        operationId: `parallel-create-${index}`,
      })
    )
  );
  assert.equal((await store.listPosts()).filter(post => post.slug.startsWith("parallel-")).length, 40);
});

await test("snapshots pin one catalog generation while tombstones hide current posts", async () => {
  const { client, store } = fixture();
  const first = await store.putPost("first", bytes("first revision"), {
    expectedRevision: "absent",
    operationId: "create-first",
  });
  const snapshot = await store.snapshot();
  await store.putPost("second", bytes("second revision"), {
    expectedRevision: "absent",
    operationId: "create-second",
  });
  await store.deletePost("first", {
    expectedRevision: first.revision,
    operationId: "delete-first",
  });

  assert.deepEqual((await store.listPosts(snapshot)).map(post => post.slug), ["first"]);
  assert.deepEqual((await store.listPosts()).map(post => post.slug), ["second"]);
  assert.ok(client.objects.has(`content/posts/sha256/${first.sha256}.md`));
  const catalogs = [...client.objects.entries()].filter(([key]) => key.includes("/catalogs/"));
  const latest = JSON.parse(text(catalogs.at(-1)[1].body));
  assert.equal(latest.tombstones.first.revision, first.revision);
  assert.ok(Date.parse(latest.tombstones.first.gcEligibleAt) > Date.parse(latest.tombstones.first.deletedAt));
});

await test("an explicitly selected catalog generation restores its exact posts and tombstones", async () => {
  const { store } = fixture();
  const first = await store.putPost("first-generation", bytes("first"), {
    expectedRevision: "absent",
    operationId: "generation-create-first",
  });
  const generationOne = await store.snapshotAtGeneration(1);
  await store.putPost("second-generation", bytes("second"), {
    expectedRevision: "absent",
    operationId: "generation-create-second",
  });
  await store.deletePost("first-generation", {
    expectedRevision: first.revision,
    operationId: "generation-delete-first",
  });

  const selected = await store.snapshotAtGeneration(1);
  assert.equal(selected.identity, "object-catalog:1");
  assert.deepEqual([...selected.posts.keys()], ["first-generation"]);
  assert.deepEqual(
    selected.posts.get("first-generation").source,
    generationOne.posts.get("first-generation").source
  );
  assert.equal(selected.tombstones.size, 0);

  const current = await store.snapshot();
  assert.deepEqual([...current.posts.keys()], ["second-generation"]);
  assert.equal(current.tombstones.has("first-generation"), true);
});

await test("a failure before pointer commit exposes no partial release", async () => {
  const { client, store } = fixture();
  client.failBeforePointer = true;
  await assert.rejects(
    store.putPost("unreleased", bytes("orphan"), {
      expectedRevision: "absent",
      operationId: "create-orphan",
    }),
    BlogStoreUnavailableError
  );
  client.failBeforePointer = false;
  assert.equal(await store.getPost("unreleased"), null);
  assert.ok(client.objects.has(`content/posts/sha256/${digest(bytes("orphan"))}.md`));
});

await test("a pointer readback substituted after a response without ETag is never acknowledged", async () => {
  const { client, store } = fixture({ catalogCasRetries: 1 });
  client.replacePointerAfterWrite = true;

  await assert.rejects(
    store.putPost("uncommitted", bytes("not released"), {
      expectedRevision: "absent",
      operationId: "create-uncommitted",
    }),
    BlogStoreUnavailableError
  );
});

await test("corrupt or missing catalog data and provider failures fail closed", async () => {
  const { client, store } = fixture();
  const safe = await store.putPost("safe", bytes("safe"), {
    expectedRevision: "absent",
    operationId: "create-safe",
  });
  client.objects.get(`content/posts/sha256/${safe.sha256}.md`).body = new Uint8Array([
    0xc3,
    0x28,
  ]);
  await assert.rejects(store.getPost("safe"), BlogStoreUnavailableError);

  const pointerKey = "content/control/catalog-pointer.json";
  const pointer = JSON.parse(text(client.objects.get(pointerKey).body));
  client.objects.get(pointer.catalogKey).body = bytes("corrupt");
  await new Promise(resolve => setTimeout(resolve, 10));
  await assert.rejects(store.snapshot(), BlogStoreUnavailableError);

  client.objects.delete(pointer.catalogKey);
  await assert.rejects(store.snapshot(), BlogStoreUnavailableError);
});

await test("timeout, authorization, and throttling failures are controlled storage outages", async () => {
  const failures = [
    Object.assign(new Error("request timed out"), { name: "TimeoutError" }),
    Object.assign(new Error("forbidden"), {
      name: "AccessDenied",
      $metadata: { httpStatusCode: 403 },
    }),
    Object.assign(new Error("slow down"), {
      name: "SlowDown",
      $metadata: { httpStatusCode: 503 },
    }),
  ];

  for (const failure of failures) {
    const { client, store } = fixture();
    client.getFailure = failure;
    await assert.rejects(store.snapshot(), BlogStoreUnavailableError);
  }

  const { client, store } = fixture();
  client.headFailure = failures[1];
  await assert.rejects(store.ready(), BlogStoreUnavailableError);
});

await test("pointer caching is bounded and refreshes to a newer generation", async () => {
  const client = new FakeS3();
  const cachedReader = storeFor(client, { cacheTtlMs: 50 });
  const writer = storeFor(client, { cacheTtlMs: 50 });

  assert.deepEqual(await cachedReader.listPosts(), []);
  await writer.putPost("new-generation", bytes("visible after refresh"), {
    expectedRevision: "absent",
    operationId: "create-new-generation",
  });

  assert.equal(await cachedReader.getPost("new-generation"), null);
  await new Promise(resolve => setTimeout(resolve, 60));
  assert.equal(
    text((await cachedReader.getPost("new-generation")).source),
    "visible after refresh"
  );
});

await test("invalid UTF-8 and oversized inputs fail before object writes", async () => {
  const { client, store } = fixture({ maxSourceBytes: 4 });
  await assert.rejects(
    store.putPost("invalid", new Uint8Array([0xc3, 0x28]), {
      expectedRevision: "absent",
      operationId: "invalid-source",
    }),
    BlogStoreValidationError
  );
  await assert.rejects(
    store.putPost("oversized", bytes("12345"), {
      expectedRevision: "absent",
      operationId: "oversized-source",
    }),
    BlogStoreValidationError
  );
  assert.equal(client.objects.size, 0);
});

await test("stale and conflicting mutations do not create immutable objects", async () => {
  const { client, store } = fixture();
  const created = await store.putPost("preflight-post", bytes("one"), {
    expectedRevision: "absent",
    operationId: "preflight-create",
  });
  const objectCount = client.objects.size;

  await assert.rejects(
    store.putPost("preflight-post", bytes("duplicate candidate"), {
      expectedRevision: "absent",
      operationId: "preflight-duplicate",
    }),
    BlogStoreConflictError
  );
  assert.equal(client.objects.size, objectCount);
  assert.equal(
    client.objects.has(
      `content/posts/sha256/${digest(bytes("duplicate candidate"))}.md`
    ),
    false
  );

  await assert.rejects(
    store.putPost("preflight-post", bytes("stale candidate"), {
      expectedRevision: "not-current-revision",
      operationId: "preflight-stale",
    }),
    BlogStoreConflictError
  );
  assert.equal(client.objects.size, objectCount);
  assert.equal(
    client.objects.has(
      `content/posts/sha256/${digest(bytes("stale candidate"))}.md`
    ),
    false
  );

  await assert.rejects(
    store.putPost("preflight-post", bytes("conflicting retry"), {
      expectedRevision: created.revision,
      operationId: "preflight-create",
    }),
    BlogStoreConflictError
  );
  assert.equal(client.objects.size, objectCount);
  assert.equal(
    client.objects.has(
      `content/posts/sha256/${digest(bytes("conflicting retry"))}.md`
    ),
    false
  );
});

await test("an idempotent retry performs no immutable writes", async () => {
  const { client, store } = fixture();
  const source = bytes("idempotent source");
  const created = await store.putPost("idempotent-post", source, {
    expectedRevision: "absent",
    operationId: "idempotent-create",
  });
  const objectCount = client.objects.size;
  const pointerWrites = client.pointerWrites;

  const retried = await store.putPost("idempotent-post", source, {
    expectedRevision: "absent",
    operationId: "idempotent-create",
  });

  assert.equal(retried.revision, created.revision);
  assert.equal(client.objects.size, objectCount);
  assert.equal(client.pointerWrites, pointerWrites);
});

await test("configuration diagnostics are provider-neutral and never contain credential literals", async () => {
  const config = objectBlogStoreConfigFromEnv({
    CONTENT_OBJECT_ENDPOINT: "https://objects.example.test",
    CONTENT_OBJECT_REGION: "us-test-1",
    CONTENT_OBJECT_BUCKET: "blog",
    CONTENT_OBJECT_PREFIX: "/tenant/blog/",
    CONTENT_OBJECT_FORCE_PATH_STYLE: "true",
    CONTENT_OBJECT_REQUEST_TIMEOUT_MS: "2500",
    CONTENT_OBJECT_MAX_ATTEMPTS: "4",
  });
  assert.deepEqual(config.diagnostics, {
    provider: "s3-compatible",
    endpointConfigured: true,
    region: "us-test-1",
    bucket: "blog",
    prefix: "tenant/blog",
    forcePathStyle: true,
    requestTimeoutMs: 2500,
    maxAttempts: 4,
  });
  assert.deepEqual(Object.keys(config.diagnostics).sort(), [
    "bucket",
    "endpointConfigured",
    "forcePathStyle",
    "maxAttempts",
    "prefix",
    "provider",
    "region",
    "requestTimeoutMs",
  ]);
});

console.log(`PASS ${passed} FAIL ${failed}`);
if (failed > 0) process.exitCode = 1;
