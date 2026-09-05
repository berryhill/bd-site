import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  BlogStoreReplicationPendingError,
  BlogStoreUnavailableError,
  type BlogSnapshot,
  type BlogStore,
  type DeletePostOptions,
  type PutPostOptions,
  type StoredPost,
} from "@/content/blogStore";

export type MirrorAuthority = "filesystem" | "object";
export type ReconciliationState =
  | "prepared"
  | "committed-primary"
  | "replication-pending"
  | "complete";

export interface MirrorReconciliationRecord {
  version: 1;
  operationId: string;
  action: "put" | "delete";
  slug: string;
  authority: MirrorAuthority;
  state: ReconciliationState;
  sourceSha256?: string;
  primaryRevision?: string;
  updatedAt: string;
  failureCode?: string;
}

export interface MirrorEvidenceJournal {
  read(operationId: string): Promise<MirrorReconciliationRecord | null>;
  write(record: MirrorReconciliationRecord): Promise<void>;
}

const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export class FilesystemMirrorEvidenceJournal implements MirrorEvidenceJournal {
  constructor(private readonly directory: string) {}

  async read(operationId: string) {
    try {
      return JSON.parse(
        await fs.readFile(this.recordPath(operationId), "utf8")
      ) as MirrorReconciliationRecord;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw new BlogStoreUnavailableError(
        "Failed to read mirror reconciliation evidence",
        error
      );
    }
  }

  async write(record: MirrorReconciliationRecord) {
    try {
      await fs.mkdir(this.directory, { recursive: true });
      const destination = this.recordPath(record.operationId);
      const temporary = `${destination}.${randomUUID()}.tmp`;
      await fs.writeFile(temporary, JSON.stringify(record, null, 2), {
        flag: "wx",
        mode: 0o600,
      });
      await fs.rename(temporary, destination);
    } catch (error) {
      throw new BlogStoreUnavailableError(
        "Failed to persist mirror reconciliation evidence",
        error
      );
    }
  }

  private recordPath(operationId: string) {
    return path.join(this.directory, `${digest(operationId)}.json`);
  }
}

export class MirrorBlogStore implements BlogStore {
  constructor(
    private readonly primary: BlogStore,
    private readonly secondary: BlogStore,
    private readonly authority: MirrorAuthority,
    private readonly journal: MirrorEvidenceJournal
  ) {}

  snapshot(): Promise<BlogSnapshot> {
    return this.primary.snapshot();
  }

  listPosts(snapshot?: BlogSnapshot): Promise<readonly StoredPost[]> {
    return this.primary.listPosts(snapshot);
  }

  getPost(slug: string, snapshot?: BlogSnapshot): Promise<StoredPost | null> {
    return this.primary.getPost(slug, snapshot);
  }

  async ready(): Promise<void> {
    await this.primary.ready();
  }

  async putPost(slug: string, source: Uint8Array, options: PutPostOptions) {
    const existing = await this.journal.read(options.operationId);
    this.assertRetry(existing, "put", slug);
    const sourceSha256 = createHash("sha256").update(source).digest("hex");
    if (existing?.sourceSha256 && existing.sourceSha256 !== sourceSha256) {
      throw new BlogStoreUnavailableError(
        "Mirror operation retry source does not match the committed primary bytes"
      );
    }
    let primaryPost: StoredPost;
    if (existing?.primaryRevision) {
      const current = await this.primary.getPost(slug);
      if (!current || current.revision !== existing.primaryRevision) {
        throw new BlogStoreUnavailableError(
          "Recorded primary mirror commit no longer matches authority"
        );
      }
      primaryPost = current;
    } else {
      await this.record(options.operationId, "put", slug, "prepared", {
        sourceSha256,
      });
      primaryPost = await this.primary.putPost(slug, source, options);
      try {
        await this.record(
          options.operationId,
          "put",
          slug,
          "committed-primary",
          {
            sourceSha256: primaryPost.sha256,
            primaryRevision: primaryPost.revision,
          }
        );
      } catch (error) {
        throw new BlogStoreReplicationPendingError(
          options.operationId,
          "put",
          slug,
          primaryPost.revision,
          error
        );
      }
    }

    try {
      await this.replicatePut(slug, source, options.operationId);
      await this.record(options.operationId, "put", slug, "complete", {
        sourceSha256: primaryPost.sha256,
        primaryRevision: primaryPost.revision,
      });
      return primaryPost;
    } catch (error) {
      await this.record(
        options.operationId,
        "put",
        slug,
        "replication-pending",
        {
          sourceSha256: primaryPost.sha256,
          primaryRevision: primaryPost.revision,
          failureCode: this.failureCode(error),
        }
      ).catch(() => undefined);
      throw new BlogStoreReplicationPendingError(
        options.operationId,
        "put",
        slug,
        primaryPost.revision,
        error
      );
    }
  }

  async deletePost(slug: string, options: DeletePostOptions): Promise<void> {
    const existing = await this.journal.read(options.operationId);
    this.assertRetry(existing, "delete", slug);
    if (!existing || existing.state === "prepared") {
      await this.record(options.operationId, "delete", slug, "prepared");
      await this.primary.deletePost(slug, options);
      try {
        await this.record(
          options.operationId,
          "delete",
          slug,
          "committed-primary"
        );
      } catch (error) {
        throw new BlogStoreReplicationPendingError(
          options.operationId,
          "delete",
          slug,
          undefined,
          error
        );
      }
    }

    try {
      const secondary = await this.secondary.getPost(slug);
      if (secondary) {
        await this.secondary.deletePost(slug, {
          expectedRevision: secondary.revision,
          operationId: this.secondaryOperationId(options.operationId),
        });
      }
      await this.record(options.operationId, "delete", slug, "complete");
    } catch (error) {
      await this.record(
        options.operationId,
        "delete",
        slug,
        "replication-pending",
        {
          failureCode: this.failureCode(error),
        }
      ).catch(() => undefined);
      throw new BlogStoreReplicationPendingError(
        options.operationId,
        "delete",
        slug,
        undefined,
        error
      );
    }
  }

  private async replicatePut(
    slug: string,
    source: Uint8Array,
    operationId: string
  ) {
    const current = await this.secondary.getPost(slug);
    const sourceSha256 = createHash("sha256").update(source).digest("hex");
    if (current?.sha256 === sourceSha256) return;
    await this.secondary.putPost(slug, source, {
      expectedRevision: current?.revision ?? "absent",
      operationId: this.secondaryOperationId(operationId),
    });
  }

  private secondaryOperationId(operationId: string) {
    return `mirror-${digest(operationId).slice(0, 48)}`;
  }

  private assertRetry(
    record: MirrorReconciliationRecord | null,
    action: "put" | "delete",
    slug: string
  ) {
    if (record && (record.action !== action || record.slug !== slug)) {
      throw new BlogStoreUnavailableError(
        "Mirror operationId was already used for a different mutation"
      );
    }
  }

  private async record(
    operationId: string,
    action: "put" | "delete",
    slug: string,
    state: ReconciliationState,
    details: Partial<MirrorReconciliationRecord> = {}
  ) {
    await this.journal.write({
      version: 1,
      operationId,
      action,
      slug,
      authority: this.authority,
      state,
      updatedAt: new Date().toISOString(),
      ...details,
    });
  }

  private failureCode(error: unknown) {
    return error instanceof Error
      ? ((error as Error & { code?: string }).code ?? error.name)
      : "UNKNOWN";
  }
}
