type JsonLdScalar = string | number | boolean;
type JsonLdValue =
  | JsonLdScalar
  | JsonLdObject
  | JsonLdValue[]
  | null
  | undefined;
type JsonLdObject = { [key: string]: JsonLdValue };

export interface BlogPostingJsonLdInput {
  title: string;
  description: string;
  url: string;
  image?: string;
  author: string;
  authorUrl?: string;
  pubDatetime: Date;
  modDatetime?: Date | null;
  tags?: string[];
}

export interface WebSiteJsonLdInput {
  name: string;
  url: string;
  description: string;
  image?: string;
  author: string;
  authorUrl?: string;
}

export interface PersonJsonLdInput {
  name: string;
  url?: string;
  image?: string;
  description?: string;
}

export interface CollectionPageJsonLdInput {
  title: string;
  description: string;
  url: string;
  isPartOf?: string;
}

function stripNullishValues<T extends JsonLdValue>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter(item => item !== undefined && item !== null)
      .map(item => stripNullishValues(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([, entryValue]) => entryValue !== undefined && entryValue !== null
        )
        .map(([key, entryValue]) => [key, stripNullishValues(entryValue)])
    ) as T;
  }

  return value;
}

function buildPersonReference(name: string, url?: string) {
  return stripNullishValues({
    "@type": "Person",
    name,
    url,
  });
}

export function buildBlogPostingJsonLd(input: BlogPostingJsonLdInput) {
  const author = buildPersonReference(input.author, input.authorUrl);

  return stripNullishValues({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.title,
    description: input.description,
    url: input.url,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": input.url,
    },
    image: input.image ? [input.image] : undefined,
    keywords: input.tags?.length ? input.tags : undefined,
    datePublished: input.pubDatetime.toISOString(),
    dateModified: input.modDatetime?.toISOString(),
    author: [author],
    publisher: author,
  });
}

export function buildWebSiteJsonLd(input: WebSiteJsonLdInput) {
  return stripNullishValues({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: input.name,
    url: input.url,
    description: input.description,
    image: input.image ? [input.image] : undefined,
    author: buildPersonReference(input.author, input.authorUrl),
  });
}

export function buildPersonJsonLd(input: PersonJsonLdInput) {
  return stripNullishValues({
    "@context": "https://schema.org",
    "@type": "Person",
    name: input.name,
    url: input.url,
    image: input.image,
    description: input.description,
  });
}

export function buildCollectionPageJsonLd(input: CollectionPageJsonLdInput) {
  return stripNullishValues({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.title,
    description: input.description,
    url: input.url,
    isPartOf: input.isPartOf
      ? {
          "@type": "WebSite",
          name: input.isPartOf,
        }
      : undefined,
  });
}
