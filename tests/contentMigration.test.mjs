/* eslint-disable no-console */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FilesystemBlogStore } from "../src/content/filesystemBlogStore.ts";
import {
  migrateBlogStore,
  assertDisposableRestorePath,
  verifyBlogStores,
  writeMigrationManifest,
} from "../src/content/contentMigration.ts";

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

const markdown = (title, options = {}) =>
  new TextEncoder().encode(
    `---\ntitle: ${title}\ndescription: Test\npubDatetime: ${options.pubDatetime ?? "2026-01-01T00:00:00Z"}${options.modDatetime ? `\nmodDatetime: ${options.modDatetime}` : ""}\ndraft: ${options.draft ?? false}\ntags: [migration]\n---\nBody  \n`
  );

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bd-migration-"));
  const sourcePath = path.join(root, "source");
  const destinationPath = path.join(root, "destination-generation");
  await fs.mkdir(sourcePath);
  await fs.mkdir(destinationPath);
  return {
    root,
    sourcePath,
    destinationPath,
    source: new FilesystemBlogStore({ baseDir: sourcePath }),
    destination: new FilesystemBlogStore({ baseDir: destinationPath }),
  };
}

await test("forward and reverse-style migration preserve exact bytes and are idempotent", async () => {
  const context = await fixture();
  try {
    const raw = markdown("Exact");
    await context.source.putPost("exact", raw, {
      expectedRevision: "absent",
      operationId: "source-exact",
    });
    const first = await migrateBlogStore({
      source: context.source,
      destination: context.destination,
      migrationId: "forward-1",
      direction: "filesystem-to-object",
    });
    assert.equal(first.verified, true);
    assert.equal(first.posts[0].action, "copy");
    assert.deepEqual((await context.destination.getPost("exact")).source, raw);

    const second = await migrateBlogStore({
      source: context.source,
      destination: context.destination,
      migrationId: "forward-2",
      direction: "filesystem-to-object",
    });
    assert.equal(second.verified, true);
    assert.equal(second.posts[0].action, "unchanged");
    assert.equal(
      (await fs.readdir(context.destinationPath)).filter(name => name.endsWith(".md")).length,
      1
    );
  } finally {
    await fs.rm(context.root, { recursive: true, force: true });
  }
});

await test("source drift blocks final verification and a delta pass converges", async () => {
  const context = await fixture();
  try {
    await context.source.putPost("first", markdown("First"), {
      expectedRevision: "absent",
      operationId: "source-first",
    });
    let snapshots = 0;
    const driftingSource = new Proxy(context.source, {
      get(target, property) {
        if (property === "snapshot") {
          return async () => {
            snapshots += 1;
            if (snapshots === 2) {
              await target.putPost("late", markdown("Late"), {
                expectedRevision: "absent",
                operationId: "source-late",
              });
            }
            return target.snapshot();
          };
        }
        const value = target[property];
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const drifted = await migrateBlogStore({
      source: driftingSource,
      destination: context.destination,
      migrationId: "drift-pass",
      direction: "filesystem-to-object",
    });
    assert.equal(drifted.sourceDrift, true);
    assert.equal(drifted.verified, false);

    const delta = await migrateBlogStore({
      source: context.source,
      destination: context.destination,
      migrationId: "delta-pass",
      direction: "filesystem-to-object",
    });
    assert.equal(delta.sourceDrift, false);
    assert.equal(delta.verified, true);
    assert.deepEqual(
      (await context.destination.listPosts()).map(post => post.slug),
      ["first", "late"]
    );
  } finally {
    await fs.rm(context.root, { recursive: true, force: true });
  }
});

await test("tombstones deterministically remove files during reverse materialization", async () => {
  const context = await fixture();
  try {
    await context.destination.putPost("deleted", markdown("Deleted"), {
      expectedRevision: "absent",
      operationId: "destination-deleted",
    });
    const snapshot = await context.source.snapshot();
    const selectedCatalog = {
      ...snapshot,
      identity: "object-catalog:42",
      tombstones: new Set(["deleted"]),
    };
    const manifest = await migrateBlogStore({
      source: context.source,
      destination: context.destination,
      sourceSnapshot: selectedCatalog,
      migrationId: "reverse-42",
      direction: "object-to-filesystem",
    });
    assert.equal(await context.destination.getPost("deleted"), null);
    assert.equal(manifest.posts.find(post => post.slug === "deleted").action, "delete");
    assert.equal(manifest.verified, true);
  } finally {
    await fs.rm(context.root, { recursive: true, force: true });
  }
});

await test("verification reports checksum, parsed, filtering, and sort parity", async () => {
  const context = await fixture();
  try {
    await context.source.putPost(
      "public",
      markdown("Public", { pubDatetime: "2026-01-02T00:00:00Z" }),
      { expectedRevision: "absent", operationId: "source-public" }
    );
    await context.source.putPost("draft", markdown("Draft", { draft: true }), {
      expectedRevision: "absent",
      operationId: "source-draft",
    });
    await migrateBlogStore({
      source: context.source,
      destination: context.destination,
      migrationId: "verify-copy",
      direction: "filesystem-to-object",
    });
    const verification = await verifyBlogStores(context.source, context.destination);
    assert.equal(verification.equal, true);
    assert.deepEqual(verification.publicOrder.source, ["public"]);
    assert.equal(verification.publicOrderMatches, true);
  } finally {
    await fs.rm(context.root, { recursive: true, force: true });
  }
});

await test("verification models public chronology by publication time, not modification time", async () => {
  const context = await fixture();
  try {
    await context.source.putPost(
      "newer-publication",
      markdown("Newer publication", {
        pubDatetime: "2026-02-02T00:00:00Z",
      }),
      { expectedRevision: "absent", operationId: "source-newer-publication" }
    );
    await context.source.putPost(
      "older-but-edited",
      markdown("Older but edited", {
        pubDatetime: "2026-02-01T00:00:00Z",
        modDatetime: "2026-03-01T00:00:00Z",
      }),
      { expectedRevision: "absent", operationId: "source-older-but-edited" }
    );
    await migrateBlogStore({
      source: context.source,
      destination: context.destination,
      migrationId: "verify-publication-order",
      direction: "filesystem-to-object",
    });

    const verification = await verifyBlogStores(context.source, context.destination);
    assert.deepEqual(verification.publicOrder.source, [
      "newer-publication",
      "older-but-edited",
    ]);
  } finally {
    await fs.rm(context.root, { recursive: true, force: true });
  }
});

await test("dry runs do not mutate and manifests contain metadata but no Markdown bodies", async () => {
  const context = await fixture();
  try {
    await context.source.putPost("dry", markdown("SecretBodyMarker"), {
      expectedRevision: "absent",
      operationId: "source-dry",
    });
    const manifest = await migrateBlogStore({
      source: context.source,
      destination: context.destination,
      migrationId: "dry-run",
      direction: "filesystem-to-object",
      dryRun: true,
    });
    assert.equal((await context.destination.listPosts()).length, 0);
    assert.equal(manifest.posts[0].action, "would-copy");
    const manifestPath = path.join(context.root, "manifest.json");
    await writeMigrationManifest(manifestPath, manifest);
    const serialized = await fs.readFile(manifestPath, "utf8");
    assert.doesNotMatch(serialized, /SecretBodyMarker|Body  /);
    assert.match(serialized, /"sha256"/);
    assert.match(serialized, /"bytes"/);
  } finally {
    await fs.rm(context.root, { recursive: true, force: true });
  }
});

await test("verify-only is non-mutating and reports whether stores already match", async () => {
  const context = await fixture();
  try {
    await context.source.putPost("verify-only", markdown("Verify only"), {
      expectedRevision: "absent",
      operationId: "source-verify-only",
    });
    const unequal = await migrateBlogStore({
      source: context.source,
      destination: context.destination,
      migrationId: "verify-only-unequal",
      direction: "filesystem-to-object",
      verifyOnly: true,
    });
    assert.equal(unequal.verified, false);
    assert.deepEqual(unequal.sourceOnly, ["verify-only"]);
    assert.equal((await context.destination.listPosts()).length, 0);

    await context.destination.putPost("verify-only", markdown("Verify only"), {
      expectedRevision: "absent",
      operationId: "destination-verify-only",
    });
    const equal = await migrateBlogStore({
      source: context.source,
      destination: context.destination,
      migrationId: "verify-only-equal",
      direction: "filesystem-to-object",
      verifyOnly: true,
    });
    assert.equal(equal.verified, true);
    assert.equal(equal.verifyOnly, true);
    assert.equal(equal.posts[0].action, "unchanged");
  } finally {
    await fs.rm(context.root, { recursive: true, force: true });
  }
});

await test("migration manifests independently hash the copied source bytes", async () => {
  const context = await fixture();
  try {
    const raw = markdown("Independent checksum");
    await context.source.putPost("independent-checksum", raw, {
      expectedRevision: "absent",
      operationId: "source-independent-checksum",
    });
    const snapshot = await context.source.snapshot();
    const stored = snapshot.posts.get("independent-checksum");
    const untrustedSnapshot = {
      ...snapshot,
      posts: new Map([
        ["independent-checksum", { ...stored, sha256: "0".repeat(64) }],
      ]),
    };
    const manifest = await migrateBlogStore({
      source: context.source,
      destination: context.destination,
      sourceSnapshot: untrustedSnapshot,
      migrationId: "independent-checksum-pass",
      direction: "filesystem-to-object",
    });
    const expected = createHash("sha256").update(raw).digest("hex");
    assert.equal(manifest.posts[0].sha256, expected);
    assert.equal(
      (await context.destination.getPost("independent-checksum")).sha256,
      expected
    );
  } finally {
    await fs.rm(context.root, { recursive: true, force: true });
  }
});

await test("reverse restore paths cannot overlap the active filesystem authority", async () => {
  await assert.rejects(
    assertDisposableRestorePath("/srv/blog", "/srv/blog"),
    /must not overlap/
  );
  await assert.rejects(
    assertDisposableRestorePath("/srv/blog", "/srv/blog/restore"),
    /must not overlap/
  );
  await assert.rejects(
    assertDisposableRestorePath("/srv/blog", "/srv"),
    /must not overlap/
  );
  assert.equal(
    await assertDisposableRestorePath("/srv/blog", "/srv/blog-restore-42"),
    "/srv/blog-restore-42"
  );
});

await test("reverse restore paths reject direct and parent symlink aliases", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bd-restore-alias-"));
  const activePath = path.join(root, "active");
  const safePath = path.join(root, "safe");
  const directAlias = path.join(root, "direct-alias");
  const safeAlias = path.join(root, "safe-alias");
  const parentAlias = path.join(root, "parent-alias");
  try {
    await fs.mkdir(activePath);
    await fs.mkdir(safePath);
    await fs.symlink(activePath, directAlias, "dir");
    await fs.symlink(safePath, safeAlias, "dir");
    await fs.symlink(activePath, parentAlias, "dir");

    await assert.rejects(
      assertDisposableRestorePath(activePath, directAlias),
      /must not be a symbolic link/
    );
    await assert.rejects(
      assertDisposableRestorePath(activePath, safeAlias),
      /must not be a symbolic link/
    );
    await assert.rejects(
      assertDisposableRestorePath(activePath, path.join(parentAlias, "resume")),
      /must not overlap/
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

await test("failed reverse dry-runs do not create the restore generation or manifest", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "bd-reverse-dry-run-"));
  const activePath = path.join(root, "active");
  const restorePath = path.join(root, "restore");
  const manifestPath = path.join(root, "manifest.json");
  await fs.mkdir(activePath);
  try {
    const result = spawnSync(
      process.execPath,
      [
        path.join(repositoryRoot, "node_modules", "tsx", "dist", "cli.mjs"),
        path.join(repositoryRoot, "scripts", "content-migrate.mjs"),
        "--direction",
        "object-to-filesystem",
        "--filesystem-path",
        activePath,
        "--destination-path",
        restorePath,
        "--migration-id",
        "reverse-dry-run-non-mutation",
        "--manifest",
        manifestPath,
        "--dry-run",
      ],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          AWS_ACCESS_KEY_ID: "test-placeholder",
          AWS_SECRET_ACCESS_KEY: "test-placeholder",
          AWS_EC2_METADATA_DISABLED: "true",
          CONTENT_OBJECT_BUCKET: "unavailable-test-bucket",
          CONTENT_OBJECT_ENDPOINT: "http://127.0.0.1:1",
          CONTENT_OBJECT_MAX_ATTEMPTS: "1",
          CONTENT_OBJECT_REQUEST_TIMEOUT_MS: "50",
        },
      }
    );

    assert.notEqual(result.status, 0);
    await assert.rejects(fs.stat(restorePath), error => error.code === "ENOENT");
    await assert.rejects(fs.stat(manifestPath), error => error.code === "ENOENT");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

await test("malformed frontmatter is reported and blocks completion", async () => {
  const context = await fixture();
  try {
    await fs.writeFile(path.join(context.sourcePath, "malformed.md"), "---\ntitle: Missing fields\n---\nBody\n");
    const manifest = await migrateBlogStore({
      source: context.source,
      destination: context.destination,
      migrationId: "malformed-pass",
      direction: "filesystem-to-object",
    });
    assert.equal(manifest.verified, false);
    assert.equal(manifest.malformed[0].slug, "malformed");
    assert.match(manifest.malformed[0].error, /description, pubDatetime/);
  } finally {
    await fs.rm(context.root, { recursive: true, force: true });
  }
});

console.log(`PASS ${passed} FAIL ${failed}`);
if (failed > 0) process.exitCode = 1;
