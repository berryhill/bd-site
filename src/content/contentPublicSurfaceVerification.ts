export interface PublicSurfaceVerificationInput {
  origin: URL;
  apiKey: string;
  sourceSlugs: readonly string[];
  publicOrder: readonly string[];
  representativeSlug: string;
  representativeOgSlug: string;
  representativeTag: string;
  representativeTagPostSlug?: string;
  fetchImpl?: typeof fetch;
}

export interface PublicSurfaceResult {
  name: string;
  route: string;
  status: number;
  expectedStatus: number;
  contentType: string;
  checks: Record<string, boolean>;
  ok: boolean;
}

const PNG_SIGNATURE = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const hasCanonical = (body: string, expected: string) =>
  new RegExp(
    `<link[^>]+rel=["']canonical["'][^>]+href=["']${escapeRegExp(expected)}["']|<link[^>]+href=["']${escapeRegExp(expected)}["'][^>]+rel=["']canonical["']`,
    "i"
  ).test(body);

const hasPost = (body: string, origin: URL, slug: string) => {
  const route = `/posts/${slug}/`;
  return body.includes(route) || body.includes(new URL(route, origin).href);
};

const hasNoPosts = (body: string, origin: URL, slugs: readonly string[]) =>
  slugs.every(slug => !hasPost(body, origin, slug));

const orderedVisiblePosts = (
  body: string,
  origin: URL,
  publicOrder: readonly string[]
) => {
  const positions = publicOrder
    .map(slug => {
      const route = `/posts/${slug}/`;
      const relative = body.indexOf(route);
      const absolute = body.indexOf(new URL(route, origin).href);
      const candidates = [relative, absolute].filter(position => position >= 0);
      return candidates.length === 0 ? -1 : Math.min(...candidates);
    })
    .filter(position => position >= 0);
  return (
    positions.length > 0 &&
    positions.every(
      (position, index) => index === 0 || positions[index - 1] < position
    )
  );
};

const contentTypeMatches = (contentType: string, expected: RegExp) =>
  expected.test(contentType.toLowerCase());

const makeResult = (
  name: string,
  route: string,
  status: number,
  expectedStatus: number,
  contentType: string,
  checks: Record<string, boolean>
): PublicSurfaceResult => ({
  name,
  route,
  status,
  expectedStatus,
  contentType,
  checks,
  ok:
    status === expectedStatus &&
    Object.values(checks).every(checkPassed => checkPassed),
});

export async function verifyPublicContentSurfaces(
  input: PublicSurfaceVerificationInput
): Promise<PublicSurfaceResult[]> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const publicSlugs = new Set(input.publicOrder);
  const nonPublicSlugs = input.sourceSlugs.filter(
    slug => !publicSlugs.has(slug)
  );
  const representativePostUrl = new URL(
    `/posts/${input.representativeSlug}/`,
    input.origin
  ).href;
  const tagPostSlug =
    input.representativeTagPostSlug ?? input.representativeSlug;
  const routes = [
    { name: "homepage", route: "/", status: 200 },
    { name: "posts", route: "/posts/", status: 200 },
    { name: "tags", route: "/tags/", status: 200 },
    { name: "archive-hidden", route: "/archives/", status: 404 },
    { name: "rss", route: "/rss.xml", status: 200 },
    { name: "atom", route: "/atom.xml", status: 200 },
    { name: "sitemap-posts", route: "/sitemap-posts.xml", status: 200 },
    { name: "llms", route: "/llms.txt", status: 200 },
    {
      name: "detail",
      route: `/posts/${input.representativeSlug}/`,
      status: 200,
    },
    {
      name: "tag-detail",
      route: `/tags/${input.representativeTag}/`,
      status: 200,
    },
    {
      name: "og-eligibility",
      route: `/posts/${input.representativeOgSlug}/index.png`,
      status: 200,
    },
  ] as const;
  const results: PublicSurfaceResult[] = [];

  for (const route of routes) {
    const response = await fetchImpl(new URL(route.route, input.origin), {
      headers: { "User-Agent": "bd-site-content-verifier/1.0" },
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (route.name === "og-eligibility") {
      const bytes = new Uint8Array(await response.arrayBuffer());
      results.push(
        makeResult(
          route.name,
          route.route,
          response.status,
          route.status,
          contentType,
          {
            contentType: contentTypeMatches(contentType, /^image\/png(?:;|$)/),
            pngSignature: PNG_SIGNATURE.every(
              (byte, index) => bytes[index] === byte
            ),
          }
        )
      );
      continue;
    }

    const body = await response.text();
    let checks: Record<string, boolean>;
    switch (route.name) {
      case "homepage":
      case "posts":
        checks = {
          contentType: contentTypeMatches(contentType, /^text\/html(?:;|$)/),
          canonical: hasCanonical(
            body,
            new URL(route.route, input.origin).href
          ),
          inventory: hasPost(body, input.origin, input.representativeSlug),
          publicOrder: orderedVisiblePosts(
            body,
            input.origin,
            input.publicOrder
          ),
          noPrivatePosts: hasNoPosts(body, input.origin, nonPublicSlugs),
        };
        break;
      case "tags":
        checks = {
          contentType: contentTypeMatches(contentType, /^text\/html(?:;|$)/),
          canonical: hasCanonical(
            body,
            new URL(route.route, input.origin).href
          ),
          tag: body.includes(`/tags/${input.representativeTag}/`),
        };
        break;
      case "archive-hidden":
        checks = { hidden: response.status === 404 };
        break;
      case "rss":
        checks = {
          contentType: contentTypeMatches(
            contentType,
            /^(application|text)\/(rss\+xml|xml)(?:;|$)/
          ),
          inventory: input.publicOrder.every(slug =>
            hasPost(body, input.origin, slug)
          ),
          publicOrder: orderedVisiblePosts(
            body,
            input.origin,
            input.publicOrder
          ),
          noPrivatePosts: hasNoPosts(body, input.origin, nonPublicSlugs),
        };
        break;
      case "atom":
        checks = {
          contentType: contentTypeMatches(
            contentType,
            /^(application|text)\/(atom\+xml|xml)(?:;|$)/
          ),
          inventory: input.publicOrder.every(slug =>
            hasPost(body, input.origin, slug)
          ),
          publicOrder: orderedVisiblePosts(
            body,
            input.origin,
            input.publicOrder
          ),
          noPrivatePosts: hasNoPosts(body, input.origin, nonPublicSlugs),
        };
        break;
      case "sitemap-posts":
        checks = {
          contentType: contentTypeMatches(
            contentType,
            /^(application|text)\/xml(?:;|$)/
          ),
          inventory: input.publicOrder.every(slug =>
            hasPost(body, input.origin, slug)
          ),
          noPrivatePosts: hasNoPosts(body, input.origin, nonPublicSlugs),
        };
        break;
      case "llms":
        checks = {
          contentType: contentTypeMatches(contentType, /^text\/plain(?:;|$)/),
          representativePost: body.includes(representativePostUrl),
          noPrivatePosts: hasNoPosts(body, input.origin, nonPublicSlugs),
        };
        break;
      case "detail":
        checks = {
          contentType: contentTypeMatches(contentType, /^text\/html(?:;|$)/),
          canonical: hasCanonical(body, representativePostUrl),
        };
        break;
      case "tag-detail":
        checks = {
          contentType: contentTypeMatches(contentType, /^text\/html(?:;|$)/),
          canonical: hasCanonical(
            body,
            new URL(route.route, input.origin).href
          ),
          taggedPost: hasPost(body, input.origin, tagPostSlug),
          noPrivatePosts: hasNoPosts(body, input.origin, nonPublicSlugs),
        };
        break;
    }
    results.push(
      makeResult(
        route.name,
        route.route,
        response.status,
        route.status,
        contentType,
        checks
      )
    );
  }

  const apiRoute = "/api/posts";
  const apiResponse = await fetchImpl(new URL(apiRoute, input.origin), {
    headers: {
      "x-api-key": input.apiKey,
      "User-Agent": "bd-site-content-verifier/1.0",
    },
  });
  const apiContentType = apiResponse.headers.get("content-type") ?? "";
  let apiSlugs: string[] = [];
  let validJson = false;
  try {
    const body = (await apiResponse.json()) as {
      posts?: Array<{ slug?: unknown }>;
    };
    const posts = Array.isArray(body.posts) ? body.posts : [];
    validJson = Array.isArray(body.posts);
    apiSlugs = posts
      .map(post => post.slug)
      .filter((slug): slug is string => typeof slug === "string")
      .sort();
  } catch {
    validJson = false;
  }
  results.push(
    makeResult(
      "api-inventory",
      apiRoute,
      apiResponse.status,
      200,
      apiContentType,
      {
        contentType: contentTypeMatches(
          apiContentType,
          /^application\/json(?:;|$)/
        ),
        validJson,
        inventory:
          JSON.stringify(apiSlugs) ===
          JSON.stringify([...input.sourceSlugs].sort()),
      }
    )
  );

  return results;
}
