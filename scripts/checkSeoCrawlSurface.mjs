#!/usr/bin/env node
/* eslint-disable no-console */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";
import { SITE } from "../src/config.ts";
import { getRobotsTxt } from "../src/utils/crawlSignals.ts";
import { buildStaticSitemapXml } from "../src/utils/staticSitemap.ts";
import { normalizeSiteWebsite, toAbsoluteSiteUrl } from "../src/utils/url.ts";

const DEFAULT_BASE_URL = normalizeSiteWebsite(SITE.website);
const MARKDOWN_LINK_RE = /!?(?:\[[^\]]*\]|\[[^\]]*\]\[[^\]]*\])\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const HTML_HREF_RE = /href=["']([^"']+)["']/gi;
const POST_PATH_RE = /^\/posts\/([^?#)]+?)(?:\/)?(?:[?#].*)?$/;
const ABSOLUTE_POST_RE = /^https?:\/\/berryhill\.dev\/posts\/([^?#)]+?)(?:\/)?(?:[?#].*)?$/i;

export function normalizePostPath(value) {
  const decoded = String(value).trim();
  const match = decoded.match(POST_PATH_RE) ?? decoded.match(ABSOLUTE_POST_RE);
  if (!match) return null;
  return `/posts/${match[1].replace(/^\/+|\/+$/g, "")}/`;
}

export function isMalformedCrawlUrl(value, expectedOrigin = "https://berryhill.dev") {
  let url;
  try {
    url = new URL(value);
  } catch {
    return true;
  }

  return (
    url.origin !== expectedOrigin ||
    /\/\//.test(url.pathname) ||
    /^https?:\/\/[^/]+\/https?:\/\//i.test(value)
  );
}

function addIssue(issues, message, detail = {}) {
  issues.push({ message, ...detail });
}

function getSlugFromMarkdownPath(filePath, contentDir) {
  const relative = path.relative(contentDir, filePath).replace(/\\/g, "/");
  return relative.replace(/\.mdx?$/i, "").split("/").filter(Boolean).join("/");
}

function hasPrivateSegment(filePath, contentDir) {
  return path
    .relative(contentDir, filePath)
    .split(path.sep)
    .some(segment => segment.startsWith("_"));
}

async function collectMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(fullPath)));
    } else if (/\.mdx?$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function isPublishedPost(post, now = Date.now()) {
  if (post.ignored || post.data.draft) return false;
  const pubTime = new Date(post.data.pubDatetime).getTime();
  return Number.isFinite(pubTime) && now > pubTime - SITE.scheduledPostMargin;
}

export async function loadSourcePosts({ contentDir = "src/data/blog", now } = {}) {
  const root = path.resolve(contentDir);
  const files = await collectMarkdownFiles(root);
  const loadedAt = now ?? Date.now();

  return Promise.all(
    files.map(async filePath => {
      const raw = await readFile(filePath, "utf8");
      const parsed = matter(raw);
      const slug = getSlugFromMarkdownPath(filePath, root);
      const route = normalizePostPath(`/posts/${slug}/`);
      const post = {
        filePath,
        route,
        raw,
        body: parsed.content,
        data: parsed.data,
        ignored: hasPrivateSegment(filePath, root),
      };
      return { ...post, published: isPublishedPost(post, loadedAt) };
    })
  );
}

export function auditInternalPostLinks(posts) {
  const issues = [];
  const publicRoutes = new Set(posts.filter(post => post.published).map(post => post.route));
  const knownRoutes = new Set(posts.map(post => post.route));

  for (const post of posts.filter(candidate => candidate.published)) {
    for (const re of [MARKDOWN_LINK_RE, HTML_HREF_RE]) {
      re.lastIndex = 0;
      let match;
      while ((match = re.exec(post.raw)) !== null) {
        const target = normalizePostPath(match[1]);
        if (!target) continue;
        if (publicRoutes.has(target)) continue;

        addIssue(
          issues,
          knownRoutes.has(target)
            ? "Published post links to a draft or scheduled post route"
            : "Published post links to a missing post route",
          { source: path.relative(process.cwd(), post.filePath), target }
        );
      }
    }
  }

  return issues;
}

export function extractXmlLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(match => match[1].trim());
}

function extractAttr(html, attrPattern) {
  return html.match(attrPattern)?.[1]?.trim();
}

export function auditUrlInvariants(urls, { expectedOrigin = "https://berryhill.dev", label = "url" } = {}) {
  const issues = [];
  for (const url of urls) {
    if (isMalformedCrawlUrl(url, expectedOrigin)) {
      addIssue(issues, `Malformed ${label}`, { url });
    }
  }
  return issues;
}

async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readBuiltHtml(distDir, routePath) {
  const normalized = routePath === "/" ? "index" : routePath.replace(/^\/+|\/+$/g, "");
  const candidates = [
    path.join(distDir, "client", normalized, "index.html"),
    path.join(distDir, normalized, "index.html"),
  ];

  for (const candidate of candidates) {
    if (await fileExists(candidate)) return readFile(candidate, "utf8");
  }
  return null;
}

export async function auditLocalCrawlSurface({ contentDir = "src/data/blog", distDir = "dist" } = {}) {
  const issues = [];
  const expectedOrigin = new URL(DEFAULT_BASE_URL).origin;
  const posts = await loadSourcePosts({ contentDir });
  const publicRoutes = posts.filter(post => post.published).map(post => post.route);

  issues.push(...auditInternalPostLinks(posts));

  const sitemapXml = buildStaticSitemapXml({ site: DEFAULT_BASE_URL, showArchives: SITE.showArchives });
  const sitemapLocs = extractXmlLocs(sitemapXml);
  issues.push(...auditUrlInvariants(sitemapLocs, { expectedOrigin, label: "static sitemap loc" }));
  issues.push(
    ...auditUrlInvariants(
      publicRoutes.map(route => toAbsoluteSiteUrl(route, DEFAULT_BASE_URL, { trailingSlash: true })),
      { expectedOrigin, label: "post route" }
    )
  );

  const robots = getRobotsTxt(DEFAULT_BASE_URL);
  const sitemapDirective = robots.match(/^Sitemap:\s*(\S+)/m)?.[1];
  if (sitemapDirective !== new URL("sitemap.xml", DEFAULT_BASE_URL).href) {
    addIssue(issues, "robots.txt does not target the canonical sitemap.xml", { sitemapDirective });
  }

  const searchHtml = await readBuiltHtml(distDir, "/search/");
  if (searchHtml && !/<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(searchHtml)) {
    addIssue(issues, "Built search page is missing robots noindex meta", { route: "/search/" });
  }

  for (const route of publicRoutes) {
    const html = await readBuiltHtml(distDir, route);
    if (!html) continue;
    const expectedUrl = toAbsoluteSiteUrl(route, DEFAULT_BASE_URL, { trailingSlash: true });
    const canonical = extractAttr(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
    const ogUrl = extractAttr(html, /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i);
    if (canonical !== expectedUrl || ogUrl !== expectedUrl) {
      addIssue(issues, "Canonical and OG URL disagree with public route", {
        route,
        expectedUrl,
        canonical,
        ogUrl,
      });
    }
  }

  return {
    mode: "local",
    checked: {
      posts: posts.length,
      publishedPosts: publicRoutes.length,
      sitemapLocs: sitemapLocs.length,
      builtHtml: await fileExists(distDir),
    },
    issues,
  };
}

async function fetchText(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "berryhill-dev-seo-crawl-surface-check/1.0" },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return { text, finalUrl: response.url, contentType: response.headers.get("content-type") ?? "" };
}

async function auditLiveCrawlSurface(baseUrl) {
  const issues = [];
  const base = normalizeSiteWebsite(baseUrl);
  const expectedOrigin = new URL(DEFAULT_BASE_URL).origin;
  const surfacePaths = ["/robots.txt", "/sitemap.xml", "/rss.xml", "/atom.xml", "/search/"];
  const fetched = new Map();

  for (const surfacePath of surfacePaths) {
    const url = new URL(surfacePath, base).href;
    try {
      fetched.set(surfacePath, await fetchText(url));
    } catch (error) {
      addIssue(issues, "Live crawl surface fetch failed", { url, error: error.message });
    }
  }

  const robots = fetched.get("/robots.txt")?.text ?? "";
  const robotsSitemap = robots.match(/^Sitemap:\s*(\S+)/m)?.[1];
  if (robotsSitemap !== new URL("/sitemap.xml", base).href) {
    addIssue(issues, "robots.txt does not target requested base sitemap.xml", { robotsSitemap });
  }

  const sitemapXml = fetched.get("/sitemap.xml")?.text ?? "";
  const sitemapLocs = extractXmlLocs(sitemapXml);
  issues.push(...auditUrlInvariants(sitemapLocs, { expectedOrigin, label: "sitemap loc" }));

  for (const loc of sitemapLocs.filter(loc => /sitemap-(?:static|posts)\.xml$/i.test(loc))) {
    try {
      const { text } = await fetchText(loc);
      const childLocs = extractXmlLocs(text);
      issues.push(...auditUrlInvariants(childLocs, { expectedOrigin, label: `${loc} loc` }));
      for (const childLoc of childLocs.filter(url => /\/posts\//.test(new URL(url).pathname))) {
        const { text: html } = await fetchText(childLoc);
        const canonical = extractAttr(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
        const ogUrl = extractAttr(html, /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i);
        const expected = new URL(new URL(childLoc).pathname, DEFAULT_BASE_URL).href;
        if (canonical !== expected || ogUrl !== expected) {
          addIssue(issues, "Live canonical and OG URL disagree with sitemap loc", {
            loc: childLoc,
            expected,
            canonical,
            ogUrl,
          });
        }
      }
    } catch (error) {
      addIssue(issues, "Live child sitemap audit failed", { loc, error: error.message });
    }
  }

  const searchHtml = fetched.get("/search/")?.text ?? "";
  if (!/<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(searchHtml)) {
    addIssue(issues, "Live search page is missing robots noindex meta", { route: "/search/" });
  }

  for (const [surfacePath, { text }] of fetched) {
    if (!["/rss.xml", "/atom.xml"].includes(surfacePath)) continue;
    const urls = [
      ...extractXmlLocs(text),
      ...[...text.matchAll(/(?:href|url)=["'](https?:\/\/[^"']+)["']/gi)].map(match => match[1]),
    ];
    issues.push(...auditUrlInvariants(urls, { expectedOrigin, label: `${surfacePath} URL` }));
  }

  return { mode: "live", checked: { surfaces: fetched.size, sitemapLocs: sitemapLocs.length }, issues };
}

function parseArgs(argv) {
  const options = { contentDir: "src/data/blog", distDir: "dist", baseUrl: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-url") options.baseUrl = argv[++index];
    else if (arg === "--content-dir") options.contentDir = argv[++index];
    else if (arg === "--dist-dir") options.distDir = argv[++index];
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (/^https?:\/\//i.test(arg)) options.baseUrl = arg;
  }
  return options;
}

function printUsage() {
  console.log(`Usage:
  node scripts/checkSeoCrawlSurface.mjs
  node scripts/checkSeoCrawlSurface.mjs --base-url https://berryhill.dev

Default mode is deterministic and local: source Markdown plus built dist HTML when present.
--base-url enables explicit live-network verification.`);
}

function printResult(result) {
  console.log(`SEO crawl-surface audit mode=${result.mode}`);
  console.log(`Checked: ${JSON.stringify(result.checked)}`);

  if (result.issues.length === 0) {
    console.log("PASS zero malformed sitemap/canonical/feed URLs and zero broken public post links found");
    return;
  }

  console.error(`FAIL ${result.issues.length} issue(s) found:`);
  for (const issue of result.issues) {
    console.error(`- ${issue.message}: ${JSON.stringify(issue)}`);
  }
}

export async function runCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printUsage();
    return 0;
  }

  const result = options.baseUrl
    ? await auditLiveCrawlSurface(options.baseUrl)
    : await auditLocalCrawlSurface(options);
  printResult(result);
  return result.issues.length === 0 ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().then(code => {
    process.exitCode = code;
  }).catch(error => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 2;
  });
}
