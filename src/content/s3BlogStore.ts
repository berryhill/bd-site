import { createHash, type BinaryLike } from "node:crypto";
import {
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import {
  BlogStoreConflictError,
  BlogStoreError,
  BlogStoreNotFoundError,
  BlogStorePreconditionError,
  BlogStoreUnavailableError,
  BlogStoreValidationError,
  type BlogSnapshot,
  type BlogStore,
  type DeletePostOptions,
  type PutPostOptions,
  type StoredPost,
} from "@/content/blogStore";
import {
  assertBlogOperationId,
  assertCanonicalBlogSlug,
  decodeBlogSource,
} from "@/content/blogSchema";

interface S3CommandClient {
  send(command: object): Promise<unknown>;
}

export interface ObjectStoreDiagnostics {
  provider: "s3-compatible";
  endpointConfigured: boolean;
  region: string;
  bucket: string;
  prefix: string;
  forcePathStyle: boolean;
  requestTimeoutMs: number;
  maxAttempts: number;
}

export interface ObjectBlogStoreConfig {
  endpoint?: string;
  region: string;
  bucket: string;
  prefix: string;
  forcePathStyle: boolean;
  requestTimeoutMs: number;
  maxAttempts: number;
  catalogCasRetries: number;
  cacheTtlMs: number;
  cacheMaxEntries: number;
  tombstoneRetentionMs: number;
  maxSourceBytes: number;
  diagnostics: ObjectStoreDiagnostics;
}

interface S3BlogStoreOptions {
  client: S3CommandClient;
  bucket: string;
  prefix?: string;
  catalogCasRetries?: number;
  cacheTtlMs?: number;
  cacheMaxEntries?: number;
  tombstoneRetentionMs?: number;
  maxSourceBytes?: number;
}

interface CatalogPost {
  slug: string;
  objectKey: string;
  sha256: string;
  revision: string;
  updatedAt: string;
}

interface CatalogTombstone {
  slug: string;
  objectKey: string;
  sha256: string;
  revision: string;
  deletedAt: string;
  gcEligibleAt: string;
}

interface OperationReceipt {
  kind: "put" | "delete";
  slug: string;
  fingerprint: string;
  revision?: string;
}

interface Catalog {
  version: 1;
  generation: number;
  createdAt: string;
  posts: Record<string, CatalogPost>;
  tombstones: Record<string, CatalogTombstone>;
  operations: Record<string, OperationReceipt>;
  previousCatalogKey?: string;
}

interface CatalogPointer {
  version: 1;
  generation: number;
  catalogKey: string;
  catalogSha256: string;
  updatedAt: string;
}

interface LoadedCatalog {
  pointer: CatalogPointer | null;
  pointerEtag: string | null;
  catalog: Catalog;
}

interface CachedValue<T> {
  value: T;
  expiresAt: number;
}

class CatalogCasConflict extends Error {}

const EMPTY_CATALOG: Catalog = {
  version: 1,
  generation: 0,
  createdAt: new Date(0).toISOString(),
  posts: {},
  tombstones: {},
  operations: {},
};

const DEFAULTS = {
  region: "us-east-1",
  prefix: "blog",
  requestTimeoutMs: 10_000,
  maxAttempts: 3,
  catalogCasRetries: 128,
  cacheTtlMs: 1_000,
  cacheMaxEntries: 16,
  tombstoneRetentionMs: 30 * 24 * 60 * 60 * 1_000,
  maxSourceBytes: 2 * 1024 * 1024,
} as const;

const sha256 = (source: string | NodeJS.ArrayBufferView) =>
  createHash("sha256")
    .update(source as unknown as BinaryLike)
    .digest("hex");

const jsonBytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));

const normalizePrefix = (prefix: string) =>
  prefix.split("/").filter(Boolean).join("/");

const parsePositiveInteger = (
  value: string | undefined,
  fallback: number,
  name: string
) => {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new BlogStoreValidationError(`${name} must be a positive integer`);
  }
  return parsed;
};

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined || value === "") return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new BlogStoreValidationError(
    "CONTENT_OBJECT_FORCE_PATH_STYLE must be true or false"
  );
};

export function objectBlogStoreConfigFromEnv(
  env: Partial<Record<string, string | undefined>> = process.env
): ObjectBlogStoreConfig {
  const endpoint = env.CONTENT_OBJECT_ENDPOINT?.trim() || undefined;
  const region = env.CONTENT_OBJECT_REGION?.trim() || DEFAULTS.region;
  const bucket = env.CONTENT_OBJECT_BUCKET?.trim() || "";
  const prefix = normalizePrefix(env.CONTENT_OBJECT_PREFIX ?? DEFAULTS.prefix);
  const forcePathStyle = parseBoolean(
    env.CONTENT_OBJECT_FORCE_PATH_STYLE,
    Boolean(endpoint)
  );
  const requestTimeoutMs = parsePositiveInteger(
    env.CONTENT_OBJECT_REQUEST_TIMEOUT_MS,
    DEFAULTS.requestTimeoutMs,
    "CONTENT_OBJECT_REQUEST_TIMEOUT_MS"
  );
  const maxAttempts = parsePositiveInteger(
    env.CONTENT_OBJECT_MAX_ATTEMPTS,
    DEFAULTS.maxAttempts,
    "CONTENT_OBJECT_MAX_ATTEMPTS"
  );
  const catalogCasRetries = parsePositiveInteger(
    env.CONTENT_OBJECT_CATALOG_CAS_RETRIES,
    DEFAULTS.catalogCasRetries,
    "CONTENT_OBJECT_CATALOG_CAS_RETRIES"
  );
  const cacheTtlMs = parsePositiveInteger(
    env.CONTENT_OBJECT_CACHE_TTL_MS,
    DEFAULTS.cacheTtlMs,
    "CONTENT_OBJECT_CACHE_TTL_MS"
  );
  const cacheMaxEntries = parsePositiveInteger(
    env.CONTENT_OBJECT_CACHE_MAX_ENTRIES,
    DEFAULTS.cacheMaxEntries,
    "CONTENT_OBJECT_CACHE_MAX_ENTRIES"
  );
  const tombstoneRetentionMs = parsePositiveInteger(
    env.CONTENT_OBJECT_TOMBSTONE_RETENTION_MS,
    DEFAULTS.tombstoneRetentionMs,
    "CONTENT_OBJECT_TOMBSTONE_RETENTION_MS"
  );
  const maxSourceBytes = parsePositiveInteger(
    env.CONTENT_OBJECT_MAX_SOURCE_BYTES,
    DEFAULTS.maxSourceBytes,
    "CONTENT_OBJECT_MAX_SOURCE_BYTES"
  );

  return {
    endpoint,
    region,
    bucket,
    prefix,
    forcePathStyle,
    requestTimeoutMs,
    maxAttempts,
    catalogCasRetries,
    cacheTtlMs,
    cacheMaxEntries,
    tombstoneRetentionMs,
    maxSourceBytes,
    diagnostics: {
      provider: "s3-compatible",
      endpointConfigured: Boolean(endpoint),
      region,
      bucket,
      prefix,
      forcePathStyle,
      requestTimeoutMs,
      maxAttempts,
    },
  };
}

export function createS3BlogStore(
  config = objectBlogStoreConfigFromEnv()
): S3BlogStore {
  if (!config.bucket) {
    throw new BlogStoreValidationError("CONTENT_OBJECT_BUCKET is required");
  }
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    maxAttempts: config.maxAttempts,
    requestHandler: new NodeHttpHandler({
      connectionTimeout: config.requestTimeoutMs,
      requestTimeout: config.requestTimeoutMs,
    }),
  });
  return new S3BlogStore({
    client,
    bucket: config.bucket,
    prefix: config.prefix,
    catalogCasRetries: config.catalogCasRetries,
    cacheTtlMs: config.cacheTtlMs,
    cacheMaxEntries: config.cacheMaxEntries,
    tombstoneRetentionMs: config.tombstoneRetentionMs,
    maxSourceBytes: config.maxSourceBytes,
  });
}

export class S3BlogStore implements BlogStore {
  private readonly client: S3CommandClient;
  private readonly bucket: string;
  private readonly prefix: string;
  private readonly catalogCasRetries: number;
  private readonly cacheTtlMs: number;
  private readonly cacheMaxEntries: number;
  private readonly tombstoneRetentionMs: number;
  private readonly maxSourceBytes: number;
  private pointerCache?: CachedValue<LoadedCatalog>;
  private readonly catalogCache = new Map<string, CachedValue<Catalog>>();

  constructor(options: S3BlogStoreOptions) {
    if (!options.bucket.trim()) {
      throw new BlogStoreValidationError("Object store bucket is required");
    }
    this.client = options.client;
    this.bucket = options.bucket;
    this.prefix = normalizePrefix(options.prefix ?? DEFAULTS.prefix);
    this.catalogCasRetries =
      options.catalogCasRetries ?? DEFAULTS.catalogCasRetries;
    this.cacheTtlMs = options.cacheTtlMs ?? DEFAULTS.cacheTtlMs;
    this.cacheMaxEntries = options.cacheMaxEntries ?? DEFAULTS.cacheMaxEntries;
    this.tombstoneRetentionMs =
      options.tombstoneRetentionMs ?? DEFAULTS.tombstoneRetentionMs;
    this.maxSourceBytes = options.maxSourceBytes ?? DEFAULTS.maxSourceBytes;
  }

  async ready(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      await this.loadCurrentCatalog(true);
    } catch (error) {
      throw this.asUnavailable("Object blog storage is unavailable", error);
    }
  }

  async snapshot(): Promise<BlogSnapshot> {
    const state = await this.loadCurrentCatalog();
    return this.snapshotFromCatalog(state.catalog);
  }

  async snapshotAtGeneration(generation: number): Promise<BlogSnapshot> {
    if (!Number.isSafeInteger(generation) || generation <= 0) {
      throw new BlogStoreValidationError(
        "Object catalog generation must be a positive integer"
      );
    }
    const current = await this.loadCurrentCatalog(true);
    if (current.catalog.generation === generation) {
      return this.snapshotFromCatalog(current.catalog);
    }
    try {
      let catalog = current.catalog;
      while (catalog.generation > generation && catalog.previousCatalogKey) {
        const catalogObject = await this.getObject(catalog.previousCatalogKey);
        const expectedSha256 = catalog.previousCatalogKey.match(
          /-([a-f0-9]{64})\.json$/
        )?.[1];
        if (!expectedSha256 || sha256(catalogObject.body) !== expectedSha256) {
          throw new Error("Historical catalog checksum does not match its key");
        }
        catalog = this.parseJson<Catalog>(catalogObject.body, "catalog");
      }
      if (catalog.generation !== generation) {
        throw new Error(
          "Selected catalog is not reachable from current history"
        );
      }
      return this.snapshotFromCatalog(catalog);
    } catch (error) {
      throw this.asUnavailable(
        `Object catalog generation is unavailable: ${generation}`,
        error
      );
    }
  }

  private async snapshotFromCatalog(catalog: Catalog): Promise<BlogSnapshot> {
    const posts = await Promise.all(
      Object.values(catalog.posts).map(entry => this.readCatalogPost(entry))
    );
    return {
      posts: new Map(posts.map(post => [post.slug, post])),
      identity: `object-catalog:${catalog.generation}`,
      tombstones: new Set(Object.keys(catalog.tombstones)),
    };
  }

  async listPosts(snapshot?: BlogSnapshot): Promise<readonly StoredPost[]> {
    const activeSnapshot = snapshot ?? (await this.snapshot());
    return [...activeSnapshot.posts.values()].sort((a, b) =>
      a.slug.localeCompare(b.slug)
    );
  }

  async getPost(
    slug: string,
    snapshot?: BlogSnapshot
  ): Promise<StoredPost | null> {
    assertCanonicalBlogSlug(slug);
    if (snapshot) return snapshot.posts.get(slug) ?? null;
    const state = await this.loadCurrentCatalog();
    const entry = state.catalog.posts[slug];
    return entry ? this.readCatalogPost(entry) : null;
  }

  async putPost(
    slug: string,
    source: Uint8Array,
    options: PutPostOptions
  ): Promise<StoredPost> {
    assertCanonicalBlogSlug(slug);
    assertBlogOperationId(options.operationId);
    if (!(source instanceof Uint8Array)) {
      throw new BlogStoreValidationError("Post source must be bytes");
    }
    if (source.byteLength > this.maxSourceBytes) {
      throw new BlogStoreValidationError(
        `Post source exceeds the ${this.maxSourceBytes} byte limit`
      );
    }
    decodeBlogSource(source);

    const contentSha256 = sha256(source);
    const releaseRevision = sha256(
      JSON.stringify({
        kind: "release",
        slug,
        operationId: options.operationId,
        sourceSha256: contentSha256,
      })
    );
    const objectKey = this.key(`posts/sha256/${contentSha256}.md`);
    const fingerprint = sha256(
      JSON.stringify({
        kind: "put",
        slug,
        expectedRevision: options.expectedRevision,
        sourceSha256: contentSha256,
      })
    );

    const preflight = await this.loadCurrentCatalog(true);
    const existing = await this.preflightPut(
      preflight.catalog,
      slug,
      options,
      fingerprint
    );
    if (existing) return existing;

    await this.putImmutable(
      objectKey,
      source,
      contentSha256,
      "text/markdown; charset=utf-8"
    );

    return this.commitMutation(async catalog => {
      const existing = await this.preflightPut(
        catalog,
        slug,
        options,
        fingerprint
      );
      if (existing) {
        return {
          catalog,
          result: existing,
          changed: false,
        };
      }

      const updatedAt = new Date().toISOString();
      const entry: CatalogPost = {
        slug,
        objectKey,
        sha256: contentSha256,
        revision: releaseRevision,
        updatedAt,
      };
      const next = this.copyCatalog(catalog);
      next.posts[slug] = entry;
      delete next.tombstones[slug];
      next.operations[options.operationId] = {
        kind: "put",
        slug,
        fingerprint,
        revision: entry.revision,
      };
      return {
        catalog: next,
        result: this.toStoredPost(entry, source),
        changed: true,
      };
    });
  }

  async deletePost(slug: string, options: DeletePostOptions): Promise<void> {
    assertCanonicalBlogSlug(slug);
    assertBlogOperationId(options.operationId);
    const fingerprint = sha256(
      JSON.stringify({
        kind: "delete",
        slug,
        expectedRevision: options.expectedRevision,
      })
    );

    await this.commitMutation(async catalog => {
      const receipt = catalog.operations[options.operationId];
      if (receipt) {
        this.assertMatchingReceipt(receipt, "delete", slug, fingerprint);
        return { catalog, result: undefined, changed: false };
      }
      const current = catalog.posts[slug];
      if (!current) throw new BlogStoreNotFoundError(`Post not found: ${slug}`);
      if (current.revision !== options.expectedRevision) {
        throw new BlogStorePreconditionError(`Post revision is stale: ${slug}`);
      }

      const deletedAt = new Date();
      const next = this.copyCatalog(catalog);
      delete next.posts[slug];
      next.tombstones[slug] = {
        ...current,
        deletedAt: deletedAt.toISOString(),
        gcEligibleAt: new Date(
          deletedAt.getTime() + this.tombstoneRetentionMs
        ).toISOString(),
      };
      next.operations[options.operationId] = {
        kind: "delete",
        slug,
        fingerprint,
      };
      return { catalog: next, result: undefined, changed: true };
    });
  }

  private async commitMutation<T>(
    mutate: (
      catalog: Catalog
    ) => Promise<{ catalog: Catalog; result: T; changed: boolean }>
  ): Promise<T> {
    let lastConflict: unknown;
    for (let attempt = 0; attempt < this.catalogCasRetries; attempt += 1) {
      const state = await this.loadCurrentCatalog(attempt > 0);
      const mutation = await mutate(state.catalog);
      if (!mutation.changed) return mutation.result;
      try {
        const committed = await this.writeCatalogAndPointer(
          state,
          mutation.catalog
        );
        this.pointerCache = {
          value: committed,
          expiresAt: Date.now() + this.cacheTtlMs,
        };
        return mutation.result;
      } catch (error) {
        if (error instanceof CatalogCasConflict) {
          lastConflict = error;
          this.pointerCache = undefined;
          continue;
        }
        throw this.asUnavailable("Failed to commit object catalog", error);
      }
    }
    throw this.asUnavailable(
      "Catalog changed too frequently to commit within the retry limit",
      lastConflict
    );
  }

  private async preflightPut(
    catalog: Catalog,
    slug: string,
    options: PutPostOptions,
    fingerprint: string
  ): Promise<StoredPost | undefined> {
    const receipt = catalog.operations[options.operationId];
    if (receipt) {
      this.assertMatchingReceipt(receipt, "put", slug, fingerprint);
      const entry = catalog.posts[slug];
      if (!entry || entry.revision !== receipt.revision) {
        throw new BlogStoreConflictError(
          "Idempotent operation result no longer matches stored post"
        );
      }
      return this.readCatalogPost(entry);
    }

    const current = catalog.posts[slug];
    if (options.expectedRevision === "absent") {
      if (current)
        throw new BlogStoreConflictError(`Post already exists: ${slug}`);
    } else if (!current || current.revision !== options.expectedRevision) {
      throw new BlogStorePreconditionError(`Post revision is stale: ${slug}`);
    }
    return undefined;
  }

  private async writeCatalogAndPointer(
    previous: LoadedCatalog,
    proposed: Catalog
  ): Promise<LoadedCatalog> {
    const generation = previous.catalog.generation + 1;
    const catalog: Catalog = {
      ...proposed,
      generation,
      createdAt: new Date().toISOString(),
      previousCatalogKey: previous.pointer?.catalogKey,
    };
    const catalogBody = jsonBytes(catalog);
    const catalogSha256 = sha256(catalogBody);
    const catalogKey = this.key(`catalogs/${generation}-${catalogSha256}.json`);
    await this.putImmutable(
      catalogKey,
      catalogBody,
      catalogSha256,
      "application/json"
    );

    const pointer: CatalogPointer = {
      version: 1,
      generation,
      catalogKey,
      catalogSha256,
      updatedAt: new Date().toISOString(),
    };
    const pointerBody = jsonBytes(pointer);
    const input = {
      Bucket: this.bucket,
      Key: this.pointerKey(),
      Body: pointerBody,
      ContentType: "application/json",
      ...(previous.pointerEtag
        ? { IfMatch: previous.pointerEtag }
        : { IfNoneMatch: "*" }),
    };
    try {
      const output = (await this.client.send(new PutObjectCommand(input))) as {
        ETag?: string;
      };
      if (!output.ETag) {
        const readback = await this.getObject(this.pointerKey());
        if (sha256(readback.body) !== sha256(pointerBody)) {
          throw new CatalogCasConflict();
        }
        this.cacheCatalog(catalogKey, catalog);
        return { pointer, pointerEtag: readback.etag, catalog };
      }
      this.cacheCatalog(catalogKey, catalog);
      return { pointer, pointerEtag: output.ETag, catalog };
    } catch (error) {
      if (this.isPreconditionFailed(error)) throw new CatalogCasConflict();
      throw error;
    }
  }

  private async loadCurrentCatalog(force = false): Promise<LoadedCatalog> {
    if (
      !force &&
      this.pointerCache &&
      this.pointerCache.expiresAt > Date.now()
    ) {
      return this.pointerCache.value;
    }

    let pointerObject: { body: Uint8Array; etag: string };
    try {
      pointerObject = await this.getObject(this.pointerKey());
    } catch (error) {
      if (this.isNotFound(error)) {
        const empty = {
          pointer: null,
          pointerEtag: null,
          catalog: this.copyCatalog(EMPTY_CATALOG),
        };
        this.pointerCache = {
          value: empty,
          expiresAt: Date.now() + this.cacheTtlMs,
        };
        return empty;
      }
      throw this.asUnavailable("Failed to read object catalog pointer", error);
    }

    try {
      const pointer = this.parseJson<CatalogPointer>(
        pointerObject.body,
        "catalog pointer"
      );
      this.assertPointer(pointer);
      const cached = this.catalogCache.get(pointer.catalogKey);
      let catalog: Catalog;
      if (!force && cached && cached.expiresAt > Date.now()) {
        catalog = cached.value;
      } else {
        const catalogObject = await this.getObject(pointer.catalogKey);
        if (sha256(catalogObject.body) !== pointer.catalogSha256) {
          throw new Error("Catalog checksum does not match its pointer");
        }
        catalog = this.parseJson<Catalog>(catalogObject.body, "catalog");
        this.assertCatalog(catalog, pointer);
        this.cacheCatalog(pointer.catalogKey, catalog);
      }
      const loaded = { pointer, pointerEtag: pointerObject.etag, catalog };
      this.pointerCache = {
        value: loaded,
        expiresAt: Date.now() + this.cacheTtlMs,
      };
      return loaded;
    } catch (error) {
      throw this.asUnavailable("Object catalog is missing or corrupt", error);
    }
  }

  private async readCatalogPost(entry: CatalogPost): Promise<StoredPost> {
    try {
      const object = await this.getObject(entry.objectKey);
      if (sha256(object.body) !== entry.sha256) {
        throw new Error(`Post checksum mismatch: ${entry.slug}`);
      }
      decodeBlogSource(object.body);
      return this.toStoredPost(entry, object.body);
    } catch (error) {
      throw this.asUnavailable(
        `Post object is missing or corrupt: ${entry.slug}`,
        error
      );
    }
  }

  private async putImmutable(
    key: string,
    body: Uint8Array,
    expectedSha256: string,
    contentType: string
  ): Promise<void> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          IfNoneMatch: "*",
          Metadata: { sha256: expectedSha256 },
        })
      );
    } catch (error) {
      if (!this.isPreconditionFailed(error)) {
        throw this.asUnavailable(
          `Failed to write immutable object: ${key}`,
          error
        );
      }
    }
    const readback = await this.getObject(key).catch(error => {
      throw this.asUnavailable(
        `Failed to read back immutable object: ${key}`,
        error
      );
    });
    if (sha256(readback.body) !== expectedSha256) {
      throw this.asUnavailable(`Immutable object checksum mismatch: ${key}`);
    }
  }

  private async getObject(key: string) {
    const output = (await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key })
    )) as {
      ETag?: string;
      Body?: {
        transformToByteArray?: () => Promise<Uint8Array>;
        [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array>;
      };
    };
    if (!output.Body) throw new Error(`Object body is missing: ${key}`);
    let body: Uint8Array;
    if (output.Body.transformToByteArray) {
      body = Uint8Array.from(await output.Body.transformToByteArray());
    } else if (output.Body[Symbol.asyncIterator]) {
      const chunks: Uint8Array[] = [];
      for await (const chunk of output.Body as AsyncIterable<Uint8Array>) {
        chunks.push(Uint8Array.from(chunk));
      }
      const length = chunks.reduce(
        (total, chunk) => total + chunk.byteLength,
        0
      );
      body = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.byteLength;
      }
    } else {
      throw new Error(`Object body cannot be read: ${key}`);
    }
    return { body, etag: output.ETag ?? "" };
  }

  private cacheCatalog(key: string, catalog: Catalog) {
    this.catalogCache.delete(key);
    this.catalogCache.set(key, {
      value: catalog,
      expiresAt: Date.now() + this.cacheTtlMs,
    });
    while (this.catalogCache.size > this.cacheMaxEntries) {
      const oldest = this.catalogCache.keys().next().value;
      if (oldest === undefined) break;
      this.catalogCache.delete(oldest);
    }
  }

  private copyCatalog(catalog: Catalog): Catalog {
    return {
      ...catalog,
      posts: { ...catalog.posts },
      tombstones: { ...catalog.tombstones },
      operations: { ...catalog.operations },
    };
  }

  private toStoredPost(entry: CatalogPost, source: Uint8Array): StoredPost {
    return {
      slug: entry.slug,
      source: Uint8Array.from(source),
      sha256: entry.sha256,
      revision: entry.revision,
      updatedAt: entry.updatedAt,
    };
  }

  private assertMatchingReceipt(
    receipt: OperationReceipt,
    kind: OperationReceipt["kind"],
    slug: string,
    fingerprint: string
  ) {
    if (
      receipt.kind !== kind ||
      receipt.slug !== slug ||
      receipt.fingerprint !== fingerprint
    ) {
      throw new BlogStoreConflictError(
        "operationId was already used for a different mutation"
      );
    }
  }

  private assertPointer(pointer: CatalogPointer) {
    if (
      pointer.version !== 1 ||
      !Number.isSafeInteger(pointer.generation) ||
      pointer.generation <= 0 ||
      typeof pointer.catalogKey !== "string" ||
      !pointer.catalogKey.startsWith(this.key("catalogs/")) ||
      !/^[a-f0-9]{64}$/.test(pointer.catalogSha256)
    ) {
      throw new Error("Catalog pointer shape is invalid");
    }
  }

  private assertCatalog(catalog: Catalog, pointer: CatalogPointer) {
    if (
      catalog.version !== 1 ||
      catalog.generation !== pointer.generation ||
      typeof catalog.posts !== "object" ||
      catalog.posts === null ||
      typeof catalog.tombstones !== "object" ||
      catalog.tombstones === null ||
      typeof catalog.operations !== "object" ||
      catalog.operations === null
    ) {
      throw new Error("Catalog shape is invalid");
    }
  }

  private parseJson<T>(body: Uint8Array, label: string): T {
    try {
      return JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(body)
      ) as T;
    } catch (error) {
      throw new Error(`Invalid ${label} JSON`, { cause: error });
    }
  }

  private pointerKey() {
    return this.key("control/catalog-pointer.json");
  }

  private key(suffix: string) {
    return this.prefix ? `${this.prefix}/${suffix}` : suffix;
  }

  private isPreconditionFailed(error: unknown) {
    const candidate = error as {
      name?: string;
      $metadata?: { httpStatusCode?: number };
    };
    return (
      candidate?.name === "PreconditionFailed" ||
      candidate?.$metadata?.httpStatusCode === 412
    );
  }

  private isNotFound(error: unknown) {
    const candidate = error as {
      name?: string;
      $metadata?: { httpStatusCode?: number };
    };
    return (
      candidate?.name === "NoSuchKey" ||
      candidate?.name === "NotFound" ||
      candidate?.$metadata?.httpStatusCode === 404
    );
  }

  private asUnavailable(message: string, cause?: unknown) {
    if (cause instanceof BlogStoreError) return cause;
    return new BlogStoreUnavailableError(message, cause);
  }
}
