/* eslint-disable no-console */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const files = {
  home: "src/pages/index.astro",
  postsIndex: "src/pages/posts/index.astro",
  postsArchive: "src/components/TerminalPostsArchive.astro",
  postDetail: "src/layouts/PostDetails.astro",
  about: "src/pages/about.md",
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
  [sources.about, "engineer + writer + RWA consultant"],
  [sources.about, "I build agentic software. I write about it. I help capital markets people understand both."],
  [sources.about, "What I actually do"],
  [sources.about, "Things I believe"],
  [sources.about, "How I got here"],
  [sources.about, "How I work with people"],
  [sources.about, "If you want to hire me"],
  [sources.postDetail, "$ cat {post.id}.md"],
  [sources.postDetail, "essay · long read"],
  [sources.postDetail, "table of contents"],
  [sources.postDetail, "# on this page"],
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
  assert.doesNotMatch(tabstrip, />notes\/<|>projects\/<|>uses\.md</, `${name} must hide stale terminal tabs`);
  assert.doesNotMatch(tabstrip, /href=\"\/archives\//, `${name} must not expose archives through terminal tabs`);
}

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
