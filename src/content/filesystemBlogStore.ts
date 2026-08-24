import { createHash, randomUUID, type BinaryLike } from "node:crypto";
import { constants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  BlogStoreConflictError,
  BlogStoreNotFoundError,
  BlogStorePreconditionError,
  BlogStoreUnavailableError,
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

interface FilesystemBlogStoreOptions {
  baseDir: string;
}

interface OperationReceipt {
  kind: "put" | "delete";
  slug: string;
  fingerprint: string;
  revision?: string;
}

const sha256 = (source: string | NodeJS.ArrayBufferView) =>
  createHash("sha256")
    .update(source as unknown as BinaryLike)
    .digest("hex");

const LOCK_RETRY_MS = 10;
const LOCK_TIMEOUT_MS = 5_000;
const LOCK_STALE_MS = 30_000;

export class FilesystemBlogStore implements BlogStore {
  private readonly baseDir: string;
  private readonly operationDir: string;
  private readonly lockDir: string;

  constructor(options: FilesystemBlogStoreOptions) {
    this.baseDir = path.resolve(options.baseDir);
    this.operationDir = path.join(this.baseDir, ".blogstore-operations");
    this.lockDir = path.join(this.baseDir, ".blogstore-locks");
  }

  async ready(): Promise<void> {
    try {
      const stat = await fs.stat(this.baseDir);
      if (!stat.isDirectory())
        throw new Error("Blog storage path is not a directory");
      await fs.access(this.baseDir, constants.R_OK | constants.W_OK);
    } catch (error) {
      throw this.unavailable("Blog storage is unavailable", error);
    }
  }

  async snapshot(): Promise<BlogSnapshot> {
    const posts = await this.readAllPosts();
    return { posts: new Map(posts.map(post => [post.slug, post])) };
  }

  async listPosts(snapshot?: BlogSnapshot): Promise<readonly StoredPost[]> {
    const posts = snapshot
      ? [...snapshot.posts.values()]
      : await this.readAllPosts();
    return posts.sort((a, b) => a.slug.localeCompare(b.slug));
  }

  async getPost(
    slug: string,
    snapshot?: BlogSnapshot
  ): Promise<StoredPost | null> {
    assertCanonicalBlogSlug(slug);
    if (snapshot) return snapshot.posts.get(slug) ?? null;
    return this.readPost(slug);
  }

  async putPost(
    slug: string,
    source: Uint8Array,
    options: PutPostOptions
  ): Promise<StoredPost> {
    assertCanonicalBlogSlug(slug);
    assertBlogOperationId(options.operationId);
    if (!(source instanceof Uint8Array)) {
      throw new BlogStoreConflictError("Post source must be bytes");
    }
    decodeBlogSource(source);
    const fingerprint = sha256(
      JSON.stringify({
        kind: "put",
        slug,
        expectedRevision: options.expectedRevision,
        sourceSha256: sha256(source),
      })
    );

    return this.withMutationLocks(slug, options.operationId, async () => {
      const receipt = await this.readReceipt(options.operationId);
      if (receipt) {
        this.assertMatchingReceipt(receipt, "put", slug, fingerprint);
        const current = await this.readPost(slug);
        if (!current || current.revision !== receipt.revision) {
          throw new BlogStoreConflictError(
            "Idempotent operation result no longer matches stored post"
          );
        }
        return current;
      }

      const current = await this.readPost(slug);
      if (options.expectedRevision === "absent") {
        if (current) {
          throw new BlogStoreConflictError(`Post already exists: ${slug}`);
        }
      } else if (!current || current.revision !== options.expectedRevision) {
        throw new BlogStorePreconditionError(`Post revision is stale: ${slug}`);
      }

      await this.atomicWrite(
        slug,
        source,
        options.expectedRevision === "absent"
      );
      const stored = await this.readPost(slug);
      if (!stored) {
        throw this.unavailable("Post disappeared after storage commit");
      }
      await this.writeReceipt(options.operationId, {
        kind: "put",
        slug,
        fingerprint,
        revision: stored.revision,
      });
      return stored;
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

    await this.withMutationLocks(slug, options.operationId, async () => {
      const receipt = await this.readReceipt(options.operationId);
      if (receipt) {
        this.assertMatchingReceipt(receipt, "delete", slug, fingerprint);
        return;
      }
      const current = await this.readPost(slug);
      if (!current) throw new BlogStoreNotFoundError(`Post not found: ${slug}`);
      if (current.revision !== options.expectedRevision) {
        throw new BlogStorePreconditionError(`Post revision is stale: ${slug}`);
      }
      try {
        await fs.unlink(this.postPath(slug));
        await this.writeReceipt(options.operationId, {
          kind: "delete",
          slug,
          fingerprint,
        });
      } catch (error) {
        throw this.unavailable(`Failed to delete post: ${slug}`, error);
      }
    });
  }

  private postPath(slug: string) {
    return path.join(this.baseDir, `${slug}.md`);
  }

  private async readAllPosts(): Promise<StoredPost[]> {
    try {
      const entries = await fs.readdir(this.baseDir, { withFileTypes: true });
      const slugs = entries
        .filter(
          entry =>
            entry.isFile() &&
            entry.name.endsWith(".md") &&
            !entry.name.startsWith("_")
        )
        .map(entry => entry.name.slice(0, -3));
      const canonicalSlugs = slugs.filter(slug => {
        try {
          assertCanonicalBlogSlug(slug);
          return true;
        } catch {
          return false;
        }
      });
      return (
        await Promise.all(canonicalSlugs.map(slug => this.readPost(slug)))
      ).filter((post): post is StoredPost => post !== null);
    } catch (error) {
      throw this.unavailable("Failed to list blog posts", error);
    }
  }

  private async readPost(slug: string): Promise<StoredPost | null> {
    try {
      const filePath = this.postPath(slug);
      const [source, stat] = await Promise.all([
        fs.readFile(filePath),
        fs.stat(filePath),
      ]);
      const bytes = Uint8Array.from(source);
      const digest = sha256(bytes);
      return {
        slug,
        source: bytes,
        sha256: digest,
        revision: digest,
        updatedAt: stat.mtime.toISOString(),
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw this.unavailable(`Failed to read post: ${slug}`, error);
    }
  }

  private async atomicWrite(
    slug: string,
    source: Uint8Array,
    exclusive: boolean
  ): Promise<void> {
    const destination = this.postPath(slug);
    const temporary = path.join(this.baseDir, `.${slug}.${randomUUID()}.tmp`);
    try {
      const handle = await fs.open(temporary, "wx", 0o644);
      try {
        await handle.writeFile(source);
        await handle.sync();
      } finally {
        await handle.close();
      }
      if (exclusive) {
        await fs.link(temporary, destination);
        await fs.unlink(temporary);
      } else {
        await fs.rename(temporary, destination);
      }
    } catch (error) {
      await fs.rm(temporary, { force: true }).catch(() => undefined);
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        throw new BlogStoreConflictError(`Post already exists: ${slug}`);
      }
      throw this.unavailable(`Failed to write post: ${slug}`, error);
    }
  }

  private receiptPath(operationId: string) {
    return path.join(this.operationDir, `${sha256(operationId)}.json`);
  }

  private async readReceipt(
    operationId: string
  ): Promise<OperationReceipt | null> {
    try {
      return JSON.parse(
        await fs.readFile(this.receiptPath(operationId), "utf8")
      ) as OperationReceipt;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw this.unavailable("Failed to read mutation receipt", error);
    }
  }

  private async writeReceipt(
    operationId: string,
    receipt: OperationReceipt
  ): Promise<void> {
    try {
      await fs.mkdir(this.operationDir, { recursive: true });
      const destination = this.receiptPath(operationId);
      const temporary = `${destination}.${randomUUID()}.tmp`;
      await fs.writeFile(temporary, JSON.stringify(receipt), { flag: "wx" });
      await fs.rename(temporary, destination);
    } catch (error) {
      throw this.unavailable("Failed to persist mutation receipt", error);
    }
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

  private async withMutationLocks<T>(
    slug: string,
    operationId: string,
    work: () => Promise<T>
  ): Promise<T> {
    const lockKeys = [`operation:${operationId}`, `slug:${slug}`].sort();
    const releases: Array<() => Promise<void>> = [];
    try {
      for (const key of lockKeys) releases.push(await this.acquireLock(key));
      return await work();
    } finally {
      for (const release of releases.reverse()) await release();
    }
  }

  private async acquireLock(key: string): Promise<() => Promise<void>> {
    await fs.mkdir(this.lockDir, { recursive: true });
    const lockPath = path.join(this.lockDir, `${sha256(key)}.lock`);
    const token = randomUUID();
    const startedAt = Date.now();

    while (Date.now() - startedAt < LOCK_TIMEOUT_MS) {
      try {
        const handle = await fs.open(lockPath, "wx", 0o600);
        try {
          await handle.writeFile(token);
          await handle.sync();
        } finally {
          await handle.close();
        }
        return async () => {
          try {
            if ((await fs.readFile(lockPath, "utf8")) === token) {
              await fs.unlink(lockPath);
            }
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
          }
        };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
          throw this.unavailable("Failed to acquire blog mutation lock", error);
        }
        try {
          const stat = await fs.stat(lockPath);
          if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
            await fs.unlink(lockPath);
            continue;
          }
        } catch (statError) {
          if ((statError as NodeJS.ErrnoException).code !== "ENOENT") {
            throw this.unavailable(
              "Failed to inspect blog mutation lock",
              statError
            );
          }
        }
        await delay(LOCK_RETRY_MS);
      }
    }

    throw this.unavailable("Timed out waiting for blog mutation lock");
  }

  private unavailable(message: string, cause?: unknown) {
    return new BlogStoreUnavailableError(message, cause);
  }
}
