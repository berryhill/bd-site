/* eslint-disable no-console */
import path from "node:path";
import { FilesystemBlogStore } from "../src/content/filesystemBlogStore.ts";
import { createS3BlogStore } from "../src/content/s3BlogStore.ts";
import { verifyBlogStores } from "../src/content/contentMigration.ts";
import { verifyPublicContentSurfaces } from "../src/content/contentPublicSurfaceVerification.ts";

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

const sourceName = args.get("source");
const destinationName = args.get("destination");
if (
  !["filesystem", "object"].includes(sourceName) ||
  !["filesystem", "object"].includes(destinationName) ||
  sourceName === destinationName
) {
  throw new Error("--source and --destination must select different filesystem/object backends");
}
const baseUrl = args.get("base-url");
if (typeof baseUrl !== "string") {
  throw new Error("--base-url is required for fail-closed public-surface verification");
}
const origin = new URL(baseUrl);
if (!["http:", "https:"].includes(origin.protocol)) {
  throw new Error("--base-url must use http or https");
}
const apiKeyEnvironment = args.get("api-key-env");
if (typeof apiKeyEnvironment !== "string") {
  throw new Error("--api-key-env is required for authenticated API inventory verification");
}
const apiKey = process.env[apiKeyEnvironment];
if (!apiKey) {
  throw new Error(`${apiKeyEnvironment} is not set; authenticated API inventory verification cannot run`);
}
const filesystemPath = path.resolve(
  String(args.get("filesystem-path") ?? process.env.CONTENT_STORAGE_FILESYSTEM_PATH ?? "src/data/blog")
);
const filesystem = new FilesystemBlogStore({ baseDir: filesystemPath });
const object = createS3BlogStore();
const source = sourceName === "filesystem" ? filesystem : object;
const destination = destinationName === "filesystem" ? filesystem : object;
let sourceSnapshot;
if (sourceName === "object" && args.get("catalog") !== undefined) {
  sourceSnapshot = await object.snapshotAtGeneration(Number(args.get("catalog")));
}
await source.ready();
await destination.ready();
const storage = await verifyBlogStores(source, destination, sourceSnapshot);

const representativeSlug = storage.publicOrder.source[0];
const representativeOgSlug = storage.ogEligibleSlugs[0];
const representativeTag = storage.tagSlugs[0];
if (!representativeSlug || !representativeOgSlug || !representativeTag) {
  throw new Error(
    "Full public verification requires a public detail post, a tag, and a dynamic-OG-eligible post"
  );
}
const publicSurfaces = await verifyPublicContentSurfaces({
  origin,
  apiKey,
  sourceSlugs: storage.sourceSlugs,
  publicOrder: storage.publicOrder.source,
  representativeSlug,
  representativeOgSlug,
  representativeTag,
  representativeTagPostSlug: storage.representativeTagPostSlug,
});

const result = {
  ...storage,
  publicSurfaces,
  publicSurfacesOk: publicSurfaces.every(surface => surface.ok),
};
console.log(JSON.stringify(result, null, 2));
if (!storage.equal || !result.publicSurfacesOk) process.exitCode = 1;
