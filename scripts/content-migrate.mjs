/* eslint-disable no-console */
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { FilesystemBlogStore } from "../src/content/filesystemBlogStore.ts";
import { createS3BlogStore } from "../src/content/s3BlogStore.ts";
import {
  assertDisposableRestorePath,
  migrateBlogStore,
  writeMigrationManifest,
} from "../src/content/contentMigration.ts";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const token = process.argv[index];
  if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
  const key = token.slice(2);
  const next = process.argv[index + 1];
  if (!next || next.startsWith("--")) args.set(key, true);
  else {
    args.set(key, next);
    index += 1;
  }
}

const direction = args.get("direction");
if (direction !== "filesystem-to-object" && direction !== "object-to-filesystem") {
  throw new Error(
    "--direction must be filesystem-to-object or object-to-filesystem"
  );
}
const migrationId = String(args.get("migration-id") ?? randomUUID());
const manifestPath = args.get("manifest");
if (typeof manifestPath !== "string") throw new Error("--manifest is required");
const dryRun = args.has("dry-run");
const verifyOnly = args.has("verify-only");

const filesystemPath = path.resolve(
  String(
    args.get("filesystem-path") ??
      process.env.CONTENT_STORAGE_FILESYSTEM_PATH ??
      "src/data/blog"
  )
);
const objectStore = createS3BlogStore();
let source;
let destination;
let sourceSnapshot;
let restorePath;
let createRestoreGeneration = false;

const emptyDryRunDestination = {
  async ready() {},
  async snapshot() {
    return { posts: new Map() };
  },
  async listPosts() {
    return [];
  },
  async getPost() {
    return null;
  },
  async putPost() {
    throw new Error("Dry-run destination cannot be mutated");
  },
  async deletePost() {
    throw new Error("Dry-run destination cannot be mutated");
  },
};

if (direction === "filesystem-to-object") {
  source = new FilesystemBlogStore({ baseDir: filesystemPath });
  destination = objectStore;
} else {
  const destinationPath = args.get("destination-path");
  if (typeof destinationPath !== "string") {
    throw new Error(
      "--destination-path is required for a disposable reverse generation"
    );
  }
  restorePath = await assertDisposableRestorePath(
    filesystemPath,
    String(destinationPath)
  );
  source = objectStore;
  createRestoreGeneration = !args.has("resume");
}

await source.ready();
if (direction === "object-to-filesystem") {
  const catalog = args.get("catalog");
  if (catalog !== undefined) {
    const generation = Number(catalog);
    sourceSnapshot = await objectStore.snapshotAtGeneration(generation);
  }
  if (createRestoreGeneration && !dryRun && !verifyOnly) {
    await fs.mkdir(restorePath, { recursive: false });
    // Re-resolve after creation so a symlinked parent cannot redirect writes
    // between the initial validation and destination-store construction.
    restorePath = await assertDisposableRestorePath(filesystemPath, restorePath);
  }
  destination =
    createRestoreGeneration && dryRun
      ? emptyDryRunDestination
      : new FilesystemBlogStore({ baseDir: restorePath });
}
await destination.ready();
const manifest = await migrateBlogStore({
  source,
  destination,
  migrationId,
  direction,
  dryRun,
  verifyOnly,
  deleteExtraneous: args.has("delete-extraneous"),
  sourceSnapshot,
});
await writeMigrationManifest(String(manifestPath), manifest);
console.log(
  JSON.stringify({
    migrationId: manifest.migrationId,
    direction: manifest.direction,
    sourceIdentity: manifest.sourceIdentity,
    dryRun: manifest.dryRun,
    verifyOnly: manifest.verifyOnly,
    sourceDrift: manifest.sourceDrift,
    verified: manifest.verified,
    copied: manifest.posts.filter(post => post.action === "copy").length,
    unchanged: manifest.posts.filter(post => post.action === "unchanged").length,
    deleted: manifest.posts.filter(post => post.action === "delete").length,
    malformed: manifest.malformed.length,
    manifest: path.resolve(String(manifestPath)),
    restorePath,
  })
);
if ((!dryRun || verifyOnly) && !manifest.verified) process.exitCode = 1;
