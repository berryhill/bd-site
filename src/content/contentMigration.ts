import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { BlogSnapshot, BlogStore, StoredPost } from "@/content/blogStore";
import { BlogStoreValidationError } from "@/content/blogStore";
import { parseBlogSource } from "@/content/blogSchema";
import { slugifyStr } from "@/utils/slugify";

export interface MigrationManifestPost {
  slug: string;
  path: string;
  bytes: number;
  sha256: string;
  revision: string;
  action: "copy" | "unchanged" | "delete" | "would-copy" | "would-delete";
}

export interface MigrationManifest {
  version: 1;
  migrationId: string;
  direction: "filesystem-to-object" | "object-to-filesystem";
  sourceIdentity: string;
  startedAt: string;
  completedAt: string;
  dryRun: boolean;
  verifyOnly: boolean;
  sourceDrift: boolean;
  verified: boolean;
  posts: MigrationManifestPost[];
  sourceOnly: string[];
  destinationOnly: string[];
  malformed: Array<{ slug: string; error: string }>;
}

export interface MigrateBlogStoreOptions {
  source: BlogStore;
  destination: BlogStore;
  migrationId: string;
  direction: MigrationManifest["direction"];
  dryRun?: boolean;
  verifyOnly?: boolean;
  deleteExtraneous?: boolean;
  sourceSnapshot?: BlogSnapshot;
}

const sha256 = (source: Uint8Array) =>
  createHash("sha256").update(source).digest("hex");

const containsPath = (parent: string, child: string) => {
  const relative = path.relative(parent, child);
  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  );
};

const resolvePhysicalPath = async (targetPath: string) => {
  let existingAncestor = path.resolve(targetPath);
  const missingSegments: string[] = [];

  while (true) {
    try {
      const physicalAncestor = await fs.realpath(existingAncestor);
      return path.join(physicalAncestor, ...missingSegments.reverse());
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !("code" in error) ||
        error.code !== "ENOENT"
      ) {
        throw error;
      }
      const parent = path.dirname(existingAncestor);
      if (parent === existingAncestor) throw error;
      missingSegments.push(path.basename(existingAncestor));
      existingAncestor = parent;
    }
  }
};

export async function assertDisposableRestorePath(
  activeFilesystemPath: string,
  destinationPath: string
) {
  const lexicalDestination = path.resolve(destinationPath);
  try {
    if ((await fs.lstat(lexicalDestination)).isSymbolicLink()) {
      throw new BlogStoreValidationError(
        "Reverse materialization destination must not be a symbolic link"
      );
    }
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      throw error;
    }
  }
  const active = await resolvePhysicalPath(activeFilesystemPath);
  const destination = await resolvePhysicalPath(lexicalDestination);
  if (containsPath(active, destination) || containsPath(destination, active)) {
    throw new BlogStoreValidationError(
      "Reverse materialization destination must not overlap the active filesystem path"
    );
  }
  return destination;
}

const fingerprint = (snapshot: BlogSnapshot) =>
  createHash("sha256")
    .update(
      JSON.stringify(
        [...snapshot.posts.values()]
          .map(post => [post.slug, sha256(post.source)])
          .sort(([a], [b]) => a.localeCompare(b))
      )
    )
    .digest("hex");

const operationId = (
  migrationId: string,
  action: string,
  slug: string,
  sha = ""
) =>
  `migration-${createHash("sha256")
    .update(`${migrationId}:${action}:${slug}:${sha}`)
    .digest("hex")}`;

export async function migrateBlogStore(
  options: MigrateBlogStoreOptions
): Promise<MigrationManifest> {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(options.migrationId)) {
    throw new BlogStoreValidationError("migrationId must be URL-safe");
  }
  const startedAt = new Date().toISOString();
  const sourceSnapshot =
    options.sourceSnapshot ?? (await options.source.snapshot());
  const sourceBefore = fingerprint(sourceSnapshot);
  const destinationSnapshot = await options.destination.snapshot();
  const noWrite = Boolean(options.dryRun || options.verifyOnly);
  const posts: MigrationManifestPost[] = [];
  const malformed: Array<{ slug: string; error: string }> = [];

  for (const post of [...sourceSnapshot.posts.values()].sort((a, b) =>
    a.slug.localeCompare(b.slug)
  )) {
    const sourceSha256 = sha256(post.source);
    try {
      parseBlogSource(post.source);
    } catch (error) {
      malformed.push({
        slug: post.slug,
        error: error instanceof Error ? error.message : "Invalid frontmatter",
      });
      continue;
    }
    const destinationPost = destinationSnapshot.posts.get(post.slug);
    const unchanged =
      destinationPost !== undefined &&
      sha256(destinationPost.source) === sourceSha256;
    const action = unchanged ? "unchanged" : noWrite ? "would-copy" : "copy";
    if (!unchanged && !noWrite) {
      await options.destination.putPost(post.slug, post.source, {
        expectedRevision: destinationPost?.revision ?? "absent",
        operationId: operationId(
          options.migrationId,
          "put",
          post.slug,
          sourceSha256
        ),
      });
    }
    posts.push({
      slug: post.slug,
      path: `${post.slug}.md`,
      bytes: post.source.byteLength,
      sha256: sourceSha256,
      revision: post.revision,
      action,
    });
  }

  const destinationOnly = [...destinationSnapshot.posts.keys()]
    .filter(slug => !sourceSnapshot.posts.has(slug))
    .sort();
  const deletable = destinationOnly.filter(
    slug =>
      options.deleteExtraneous || sourceSnapshot.tombstones?.has(slug) === true
  );
  for (const slug of deletable) {
    const destinationPost = destinationSnapshot.posts.get(slug)!;
    if (!noWrite) {
      await options.destination.deletePost(slug, {
        expectedRevision: destinationPost.revision,
        operationId: operationId(options.migrationId, "delete", slug),
      });
    }
    posts.push({
      slug,
      path: `${slug}.md`,
      bytes: destinationPost.source.byteLength,
      sha256: destinationPost.sha256,
      revision: destinationPost.revision,
      action: noWrite ? "would-delete" : "delete",
    });
  }

  const sourceDrift = options.sourceSnapshot
    ? false
    : sourceBefore !== fingerprint(await options.source.snapshot());
  const verification: BlogStoreVerification | undefined =
    options.dryRun && !options.verifyOnly
      ? undefined
      : await verifyBlogStores(
          options.source,
          options.destination,
          sourceSnapshot
        );
  return {
    version: 1,
    migrationId: options.migrationId,
    direction: options.direction,
    sourceIdentity: sourceSnapshot.identity ?? `snapshot:${sourceBefore}`,
    startedAt,
    completedAt: new Date().toISOString(),
    dryRun: Boolean(options.dryRun),
    verifyOnly: Boolean(options.verifyOnly),
    sourceDrift,
    verified:
      !options.dryRun &&
      !sourceDrift &&
      malformed.length === 0 &&
      verification?.equal === true,
    posts,
    sourceOnly: verification?.sourceOnly ?? [],
    destinationOnly: verification?.destinationOnly ?? destinationOnly,
    malformed,
  };
}

export async function writeMigrationManifest(
  manifestPath: string,
  manifest: MigrationManifest
) {
  const destination = path.resolve(manifestPath);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`, {
    mode: 0o600,
  });
  await fs.rename(temporary, destination);
}

export interface BlogStoreVerification {
  equal: boolean;
  sourceIdentity: string;
  sourceSlugs: string[];
  sourceOnly: string[];
  destinationOnly: string[];
  checksumMismatches: string[];
  parsedMismatches: string[];
  publicOrderMatches: boolean;
  publicOrder: { source: string[]; destination: string[] };
  ogEligibleSlugs: string[];
  tagSlugs: string[];
  representativeTagPostSlug?: string;
}

const parsedSignature = (post: StoredPost) => {
  const parsed = parseBlogSource(post.source);
  return JSON.stringify({ data: parsed.data, content: parsed.content });
};

const publicOrder = (snapshot: BlogSnapshot, now = Date.now()) =>
  [...snapshot.posts.values()]
    .flatMap(post => {
      try {
        return [{ post, data: parseBlogSource(post.source).data }];
      } catch {
        return [];
      }
    })
    .filter(
      ({ data }) =>
        !data.draft && new Date(data.pubDatetime).getTime() <= now + 15 * 60_000
    )
    .sort((a, b) => {
      const timestampDifference =
        new Date(b.data.pubDatetime).getTime() -
        new Date(a.data.pubDatetime).getTime();
      return timestampDifference || a.post.slug.localeCompare(b.post.slug);
    })
    .map(({ post }) => post.slug);

export async function verifyBlogStores(
  source: BlogStore,
  destination: BlogStore,
  pinnedSource?: BlogSnapshot
): Promise<BlogStoreVerification> {
  const sourceSnapshot = pinnedSource ?? (await source.snapshot());
  const destinationSnapshot = await destination.snapshot();
  const sourceSlugs = [...sourceSnapshot.posts.keys()].sort();
  const destinationSlugs = [...destinationSnapshot.posts.keys()].sort();
  const sourceOnly = sourceSlugs.filter(
    slug => !destinationSnapshot.posts.has(slug)
  );
  const destinationOnly = destinationSlugs.filter(
    slug => !sourceSnapshot.posts.has(slug)
  );
  const common = sourceSlugs.filter(slug =>
    destinationSnapshot.posts.has(slug)
  );
  const checksumMismatches = common.filter(
    slug =>
      sha256(sourceSnapshot.posts.get(slug)!.source) !==
      sha256(destinationSnapshot.posts.get(slug)!.source)
  );
  const parsedMismatches: string[] = [];
  for (const slug of common) {
    try {
      if (
        parsedSignature(sourceSnapshot.posts.get(slug)!) !==
        parsedSignature(destinationSnapshot.posts.get(slug)!)
      ) {
        parsedMismatches.push(slug);
      }
    } catch {
      parsedMismatches.push(slug);
    }
  }
  const sourcePublicOrder = publicOrder(sourceSnapshot);
  const destinationPublicOrder = publicOrder(destinationSnapshot);
  const publicOrderMatches =
    JSON.stringify(sourcePublicOrder) ===
    JSON.stringify(destinationPublicOrder);
  const publicSourceData = sourcePublicOrder.map(slug => ({
    slug,
    data: parseBlogSource(sourceSnapshot.posts.get(slug)!.source).data,
  }));
  const tagSlugs = [
    ...new Set(
      publicSourceData.flatMap(({ data }) =>
        Array.isArray(data.tags)
          ? data.tags.map(tag => slugifyStr(String(tag)))
          : []
      )
    ),
  ].sort();
  const representativeTag = tagSlugs[0];
  return {
    equal:
      sourceOnly.length === 0 &&
      destinationOnly.length === 0 &&
      checksumMismatches.length === 0 &&
      parsedMismatches.length === 0 &&
      publicOrderMatches,
    sourceIdentity:
      sourceSnapshot.identity ?? `snapshot:${fingerprint(sourceSnapshot)}`,
    sourceSlugs,
    sourceOnly,
    destinationOnly,
    checksumMismatches,
    parsedMismatches,
    publicOrderMatches,
    publicOrder: {
      source: sourcePublicOrder,
      destination: destinationPublicOrder,
    },
    ogEligibleSlugs: publicSourceData
      .filter(({ data }) => !data.ogImage)
      .map(({ slug }) => slug),
    tagSlugs,
    representativeTagPostSlug: representativeTag
      ? publicSourceData.find(({ data }) =>
          data.tags?.some(
            (tag: string) => slugifyStr(String(tag)) === representativeTag
          )
        )?.slug
      : undefined,
  };
}
