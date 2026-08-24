export interface StoredPost {
  slug: string;
  source: Uint8Array;
  sha256: string;
  revision: string;
  updatedAt: string;
}

export interface BlogSnapshot {
  readonly posts: ReadonlyMap<string, StoredPost>;
}

export interface PutPostOptions {
  expectedRevision: string | "absent";
  operationId: string;
}

export interface DeletePostOptions {
  expectedRevision: string;
  operationId: string;
}

export interface BlogStore {
  snapshot(): Promise<BlogSnapshot>;
  listPosts(snapshot?: BlogSnapshot): Promise<readonly StoredPost[]>;
  getPost(slug: string, snapshot?: BlogSnapshot): Promise<StoredPost | null>;
  putPost(
    slug: string,
    source: Uint8Array,
    options: PutPostOptions
  ): Promise<StoredPost>;
  deletePost(slug: string, options: DeletePostOptions): Promise<void>;
  ready(): Promise<void>;
}

export class BlogStoreError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BlogStoreValidationError extends BlogStoreError {
  constructor(message: string) {
    super(message, "BLOG_STORE_VALIDATION");
  }
}

export class BlogStoreConflictError extends BlogStoreError {
  constructor(message: string) {
    super(message, "BLOG_STORE_CONFLICT");
  }
}

export class BlogStorePreconditionError extends BlogStoreConflictError {
  constructor(message: string) {
    super(message);
  }
}

export class BlogStoreNotFoundError extends BlogStoreError {
  constructor(message: string) {
    super(message, "BLOG_STORE_NOT_FOUND");
  }
}

export class BlogStoreUnavailableError extends BlogStoreError {
  constructor(message: string, cause?: unknown) {
    super(message, "BLOG_STORE_UNAVAILABLE", cause);
  }
}
