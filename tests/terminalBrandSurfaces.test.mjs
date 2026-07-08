/* eslint-disable no-console */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const files = {
  home: "src/pages/index.astro",
  postsIndex: "src/pages/posts/index.astro",
  postsArchive: "src/components/TerminalPostsArchive.astro",
  postDetail: "src/layouts/PostDetails.astro",
  about: "src/pages/about.md",
  header: "src/components/Header.astro",
  styles: "src/styles/global.css",
  socials: "src/constants.ts",
  archivesRoute: "src/pages/archives/index.astro",
  draftflyRoute: "src/pages/projects/draftfly.astro",
};

const fixtures = {
  home: "tests/fixtures/issue-73/terminal.html",
  posts: "tests/fixtures/issue-73/berryhill-posts-terminal.html",
  about: "tests/fixtures/issue-73/about.html",
  postDetail: "tests/fixtures/issue-73/berryhill-post-detail-terminal.html",
};

const sources = Object.fromEntries(
  Object.entries(files).map(([name, path]) => [name, readFileSync(path, "utf8")])
);

const fixtureSources = Object.fromEntries(
  Object.entries(fixtures).map(([name, path]) => [name, readFileSync(path, "utf8")])
);

const forbiddenOldHybridAnchors = [
  /Matt Berryhill builds AI-native operating systems in public\./,
  /Posts as artifacts from the operating system\./,
  /Terminal metaphor\. Real claims only\./,
  /operator read/,
  /post\.yaml/,
  /What I’m building/,
  /How to read this site/,
];

for (const [name, source] of Object.entries(sources)) {
  if (["styles", "socials", "archivesRoute", "draftflyRoute"].includes(name)) continue;
  for (const pattern of forbiddenOldHybridAnchors) {
    assert.doesNotMatch(source, pattern, `${name} must not keep the old terminal-ish hybrid copy`);
  }
}

const terminalClassContract = [
  "window",
  "titlebar",
  "gnome-ctrls",
  "tabstrip",
  "tabnew",
  "term",
  "line",
  "ps1",
  "cmd",
  "out",
  "cwd",
  "path",
  "sep",
  "ls",
  "ls-row",
  "file",
  "frontmatter",
  "toc",
  "post-layout",
  "post-body",
];

for (const className of terminalClassContract) {
  const pattern = new RegExp(`class=\\"[^\\"]*${className}`);
  assert.match(
    `${sources.home}\n${sources.postsArchive}\n${sources.about}\n${sources.postDetail}`,
    pattern,
    `production sources must include prototype class ${className}`
  );
  assert.match(fixtureSources.home + fixtureSources.posts + fixtureSources.about + fixtureSources.postDetail, pattern);
}

const exactCopyAnchors = [
  [sources.home, "builder · operator · agent conductor."],
  [sources.home, "I run a fleet of specialized AI agents that design, research, code, review, write, analyze markets, and ship software with me. This site is the public terminal into that operating system."],
  [sources.home, "curl GET /fleet"],
  [sources.home, "cat manifesto.md"],
  [sources.home, "ls featured/ --sort=stars"],
  [sources.home, "ls -la recent/"],
  [sources.home, "cat .env"],
  [sources.postsArchive, "posts<span class=\"slash\">/</span><b>archive</b>"],
  [sources.postsArchive, "Long-form notes on <b>agentic-first development</b>, AI / ML systems, blockchain rails, crypto market structure, digital music, and the small frictions that change when intelligent automation moves into the loop."],
  [sources.postsArchive, "grep -i ..."],
  [sources.postsArchive, "cat pinned.md"],
  [sources.postsArchive, "ls -la {year}/"],
  [sources.postsArchive, "cat subscribe.md"],
  [sources.about, "name</span><span class=\"sep\">:</span> <span class=\"v\">Matthew Berryhill"],
  [sources.about, "engineer + writer + operator"],
  [sources.about, "I build AI-native systems and write about the operator work behind them."],
  [sources.about, "What I actually do"],
  [sources.about, "Things I believe"],
  [sources.about, "How I got here"],
  [sources.about, "How I work with people"],
  [sources.about, "Let's connect.."],
  [sources.postDetail, "$ cat {post.id}.md"],
  [sources.postDetail, "essay · long read"],
  [sources.postDetail, "table of contents"],
  [sources.postDetail, "# on this page"],
  [sources.postDetail, "tail -f post.meta"],
  [sources.postDetail, "terminal-post-footer__chip"],
  [sources.postDetail, "data-terminal-top"],
  [sources.postDetail, "cd ../"],
];

for (const [source, anchor] of exactCopyAnchors) {
  assert.ok(source.replace(/\s+/g, " ").includes(anchor), `missing exact prototype copy anchor: ${anchor}`);
}

const terminalNavSources = {
  home: sources.home,
  postsArchive: sources.postsArchive,
  postDetail: sources.postDetail,
  about: sources.about,
};

for (const [name, source] of Object.entries(terminalNavSources)) {
  const tabstrip = source.match(/<div class=\"tabstrip\">[\s\S]*?<\/div>/)?.[0] ?? "";
  assert.ok(tabstrip, `${name} must keep a terminal tabstrip`);
  assert.doesNotMatch(tabstrip, />search<|>notes\/<|>projects\/<|>uses\.md</, `${name} must hide stale terminal tabs and unavailable search`);
  assert.doesNotMatch(tabstrip, /href=\"\/search\//, `${name} must not link to unavailable search from terminal tabs`);
  assert.doesNotMatch(tabstrip, /href=\"\/archives\//, `${name} must not expose archives through terminal tabs`);
}

const postsArchiveTabstrip = sources.postsArchive.match(/<div class=\"tabstrip\">[\s\S]*?<\/div>/)?.[0] ?? "";
assert.ok(postsArchiveTabstrip, "posts archive must keep a terminal tabstrip");
assert.doesNotMatch(
  postsArchiveTabstrip,
  /href=\"\/search\/?\"|>search<|>search\/<|search\.md/,
  "posts archive terminal tabstrip must not expose a visible /search/ tab"
);

const postsArchiveRow =
  sources.postsArchive.match(/<a\s+class=\"ls-row posts-archive-row\"[\s\S]*?<\/a>/)?.[0] ?? "";
assert.ok(postsArchiveRow, "posts archive rows must use the explicit archive row class");
assert.deepEqual(
  [...postsArchiveRow.matchAll(/<span class=\"([^\"]+)\"/g)].map(match => match[1]),
  ["date", "read", "ttl", "desc", "arr"],
  "TerminalPostsArchive row markup must match the CSS column contract"
);
const postsArchiveGridContract =
  sources.styles.match(/\.posts-archive-table \.posts-archive-row \{[\s\S]*?grid-template-columns:\s*([^;]+);[\s\S]*?\}/)?.[1] ?? "";
assert.equal(
  postsArchiveGridContract.trim().split(/\s+(?![^()]*\))/).length,
  5,
  "posts archive CSS must define one explicit column for each row span"
);
assert.match(sources.styles, /\.posts-archive-row \.desc \{[\s\S]*?color: var\(--fg-secondary, var\(--fg\)\);/);

const protoWindowTokenBlock = sources.styles.match(/\.proto-window \{[\s\S]*?\}/)?.[0] ?? "";
assert.match(protoWindowTokenBlock, /--muted:\s*oklch\(58% 0\.012 240\);/);
assert.match(protoWindowTokenBlock, /--dim:\s*oklch\(38% 0\.012 240\);/);
assert.doesNotMatch(protoWindowTokenBlock, /#1b2a33/i, ".proto-window --muted must not resolve to dark theme --muted leakage");

assert.doesNotMatch(
  sources.header,
  /href=\"\/search\"|ariaLabel=\"search\"|title=\"Search\"|IconSearch/,
  "global header must not expose search as a visible nav control"
);

for (const rejectedTimelineClaim of [
  "Independent · agentic systems + RWA consulting",
  "Two retained clients",
  "Founding engineer · stealth (acquired)",
  "Sold to a public-markets infrastructure company",
  "Senior engineer · Compound Labs",
  "Engineer · Stripe",
  "First eng · acq'd analytics startup",
  "YC W15",
]) {
  assert.equal(
    sources.about.includes(rejectedTimelineClaim),
    false,
    `about page must remove fabricated timeline claim: ${rejectedTimelineClaim}`
  );
}

assert.match(sources.styles, /\.who p \{\s*color: var\(--fg\);/, "home hero paragraph must use high-contrast foreground color");

const linkedinUrl = "https://www.linkedin.com/in/matthew-berryhill/";
assert.match(sources.home, new RegExp(`href=\"${linkedinUrl.replaceAll("/", "\\/")}\"`));
assert.match(sources.home, /<b>LINKEDIN=<\/b> \/in\/matthew-berryhill/);
assert.match(sources.socials, new RegExp(`href: \"${linkedinUrl.replaceAll("/", "\\/")}\"`));

assert.match(sources.styles, /Issue #73 prototype terminal fidelity contract/);
assert.match(sources.styles, /\.terminal-cursor,\s*\n\.cursor \{/);
assert.match(sources.styles, /vertical-align: -0\.08em;/, "cursor baseline alignment must be stable");
assert.match(sources.styles, /animation: blink 1\.05s steps\(1\) infinite;/, "cursor blink timing must be stable");
assert.match(`${sources.home}\n${sources.postsArchive}\n${sources.postDetail}\n${sources.about}`, /class=\"terminal-cursor\"/);
assert.doesNotMatch(sources.home, /class=\"cursor\">&nbsp;<\/span>/, "home cursor must not be a whitespace span");
assert.match(sources.about, /class=\"terminal-exit\"/, "about bottom rail must use compact prototype footer treatment");
assert.match(sources.about, /<span class=\"eof\">EOF<\/span>/, "about bottom rail must show an EOF marker");
assert.doesNotMatch(sources.about, /If you want to hire me/, "about CTA must use the issue #81 approved wording");

assert.match(sources.postDetail, /class=\"terminal-post-footer\"/);
assert.match(sources.postDetail, /aria-label=\"post tags\"/);
assert.match(sources.postDetail, /aria-label=\"share this post\"/);
assert.match(sources.postDetail, /href=\{`\/tags\/\$\{slugifyStr\(tag\)\}\/`\}/);
assert.match(sources.postDetail, /encodeURIComponent\(postUrl\)/);
assert.match(sources.postDetail, /postTags\.length > 0/);
assert.match(sources.postDetail, /terminal-post-footer__empty/);
assert.doesNotMatch(sources.postDetail, /<ShareLinks \/>|Share this post on:|post tools|<Tag tag=|mt-2 mb-6/);
assert.match(sources.styles, /\.terminal-post-footer \{/);
assert.match(sources.styles, /\.terminal-post-footer__chip \{/);
assert.match(sources.styles, /min-height:\s*28px;/);

for (const [name, source] of [
  ["archivesRoute", sources.archivesRoute],
  ["draftflyRoute", sources.draftflyRoute],
]) {
  assert.match(source, /return new Response\(null, \{ status: 404 \}\);/, `${name} must return not found`);
  assert.match(source, /export const prerender = false;/, `${name} must remain SSR-compatible`);
}

assert.match(sources.styles, /@media \(max-width: 720px\)/, "mobile prototype CSS must be present");
assert.match(sources.styles, /@media \(min-width: 768px\)|@media \(min-width: 1000px\)/, "desktop prototype CSS must be present");
assert.match(sources.postsIndex, /<TerminalPostsArchive sortedPosts=\{sortedPosts\} currentPage=\{1\}/);

console.log("PASS terminal prototype fidelity surfaces");
