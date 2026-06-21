import { MongoClient, type Document } from "mongodb";
import { slugifyStr } from "@/utils/slugify";

export interface MongoBlogLoaderOptions {
  uri?: string;
  database?: string;
  collection?: string;
}

const DEFAULT_COLLECTION_CANDIDATES = [
  "posts",
  "blog_posts",
  "blogPosts",
  "content_posts",
];

let cachedClient: MongoClient | null = null;
let cachedUri: string | null = null;

function getMongoUri(options: MongoBlogLoaderOptions) {
  return (
    options.uri ||
    import.meta.env.MONGO_URI ||
    import.meta.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    ""
  );
}

function getMongoDatabase(options: MongoBlogLoaderOptions) {
  return (
    options.database ||
    import.meta.env.MONGO_DB ||
    import.meta.env.MONGODB_DB ||
    import.meta.env.BLOG_MONGO_DB ||
    process.env.MONGO_DB ||
    process.env.MONGODB_DB ||
    process.env.BLOG_MONGO_DB ||
    undefined
  );
}

function getCollectionCandidates(options: MongoBlogLoaderOptions) {
  const configured =
    options.collection ||
    import.meta.env.MONGO_POSTS_COLLECTION ||
    import.meta.env.BLOG_POSTS_COLLECTION ||
    process.env.MONGO_POSTS_COLLECTION ||
    process.env.BLOG_POSTS_COLLECTION;

  return configured
    ? [configured, ...DEFAULT_COLLECTION_CANDIDATES.filter(name => name !== configured)]
    : DEFAULT_COLLECTION_CANDIDATES;
}

async function getClient(uri: string) {
  if (!cachedClient || cachedUri !== uri) {
    if (cachedClient) {
      await cachedClient.close();
    }
    cachedClient = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    cachedUri = uri;
    await cachedClient.connect();
  }
  return cachedClient;
}

function coerceDate(value: unknown) {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function coerceTags(value: unknown) {
  if (Array.isArray(value)) return value.map(tag => String(tag));
  if (typeof value === "string") {
    return value
      .split(",")
      .map(tag => tag.trim())
      .filter(Boolean);
  }
  return ["others"];
}

function docSlug(doc: Document) {
  return String(
    doc.slug ||
      doc.id ||
      doc._id?.toString?.() ||
      slugifyStr(String(doc.title || "untitled"))
  );
}

function docBody(doc: Document) {
  return String(
    doc.content || doc.body || doc.markdown || doc.md || doc.rawMarkdown || ""
  );
}

function docData(doc: Document) {
  const pubDatetime =
    coerceDate(doc.pubDatetime) ||
    coerceDate(doc.publishedAt) ||
    coerceDate(doc.createdAt) ||
    new Date();

  return {
    author: doc.author,
    pubDatetime,
    modDatetime:
      coerceDate(doc.modDatetime) ||
      coerceDate(doc.updatedAt) ||
      coerceDate(doc.modifiedAt) ||
      null,
    title: String(doc.title || "Untitled"),
    featured: Boolean(doc.featured),
    draft: Boolean(doc.draft),
    tags: coerceTags(doc.tags),
    ogImage: doc.ogImage || doc.og_image || null,
    description: String(doc.description || doc.excerpt || ""),
    canonicalURL: doc.canonicalURL || doc.canonicalUrl || null,
    hideEditPost: Boolean(doc.hideEditPost),
    timezone: doc.timezone,
  };
}

function matchesFilter(doc: Document, filter: Record<string, unknown> | undefined) {
  if (!filter) return true;
  const data = docData(doc) as Record<string, unknown>;
  return Object.entries(filter).every(([key, value]) => data[key] === value);
}

async function findPostsCollection(client: MongoClient, dbName: string | undefined, candidates: string[]) {
  const db = dbName ? client.db(dbName) : client.db();
  for (const name of candidates) {
    const count = await db.collection(name).estimatedDocumentCount().catch(() => 0);
    if (count > 0) return db.collection(name);
  }
  return db.collection(candidates[0]);
}

export function mongoBlogLoader(options: MongoBlogLoaderOptions = {}) {
  return {
    name: "mongo-blog-loader",

    async loadCollection({ filter }: { filter?: Record<string, unknown> } = {}) {
      try {
        const uri = getMongoUri(options);
        if (!uri) {
          return { entries: [] };
        }

        const client = await getClient(uri);
        const collection = await findPostsCollection(
          client,
          getMongoDatabase(options),
          getCollectionCandidates(options)
        );

        const docs = await collection.find({}).sort({ pubDatetime: -1, publishedAt: -1 }).toArray();
        const entries = docs
          .filter(doc => matchesFilter(doc, filter))
          .map(doc => {
            const id = docSlug(doc);
            return {
              id,
              data: docData(doc),
              body: docBody(doc),
              filePath: `${id}.md`,
            };
          });

        return { entries };
      } catch (error) {
        console.error("Error loading Mongo blog collection:", error);
        return {
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    },

    async loadEntry({ filter }: { filter?: string | Record<string, unknown> } = {}) {
      try {
        const uri = getMongoUri(options);
        if (!uri) {
          return { error: new Error("MONGO_URI is not configured") };
        }

        const client = await getClient(uri);
        const collection = await findPostsCollection(
          client,
          getMongoDatabase(options),
          getCollectionCandidates(options)
        );

        let doc: Document | null = null;
        if (typeof filter === "string") {
          doc = await collection.findOne({
            $or: [{ slug: filter }, { id: filter }],
          });
        } else if (filter && typeof filter === "object") {
          doc = await collection.findOne(filter);
        }

        if (!doc) {
          return { error: new Error("Entry not found") };
        }

        const id = docSlug(doc);
        return {
          entry: {
            id,
            data: docData(doc),
            body: docBody(doc),
            filePath: `${id}.md`,
          },
        };
      } catch (error) {
        console.error("Error loading Mongo blog entry:", error);
        return {
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    },
  };
}
