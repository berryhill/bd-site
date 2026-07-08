/* eslint-disable no-console */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const files = {
  home: "src/pages/index.astro",
  posts: "src/pages/posts/page/[page].astro",
  postDetail: "src/layouts/PostDetails.astro",
  about: "src/pages/about.md",
  styles: "src/styles/global.css",
};

const publicSurfaceSources = Object.fromEntries(
  Object.entries(files).map(([name, path]) => [name, readFileSync(path, "utf8")])
);

const forbiddenPublicClaims = [
  [/views:\s*\d/i, "fake views"],
  [/live telemetry/i, "live telemetry"],
  [/agent count:\s*\d/i, "invented agent counts"],
  [/fleet dashboard/i, "private fleet dashboard"],
  [/production queue/i, "private production queue"],
  [/verified telemetry/i, "unverified telemetry"],
];

for (const [name, source] of Object.entries(publicSurfaceSources)) {
  for (const [pattern, label] of forbiddenPublicClaims) {
    assert.doesNotMatch(source, pattern, `${name} must not contain ${label}`);
  }
}

assert.match(publicSurfaceSources.styles, /\.terminal-shell/);
assert.match(publicSurfaceSources.styles, /\.operator-read/);
assert.match(publicSurfaceSources.home, /AI-native operating systems/);
assert.match(publicSurfaceSources.home, /Terminal metaphor\. Real claims only\./);
assert.match(publicSurfaceSources.home, /sortedPosts\.length/);
assert.match(publicSurfaceSources.home, /tagCount/);
assert.match(publicSurfaceSources.home, /lastPostLabel/);
assert.match(publicSurfaceSources.posts, /Posts as artifacts/);
assert.match(publicSurfaceSources.posts, /group-by lane/);
assert.match(publicSurfaceSources.posts, /totalWords/);
assert.match(publicSurfaceSources.posts, /sortedPosts\.length/);
assert.match(publicSurfaceSources.postDetail, /frontmatterPreview/);
assert.match(publicSurfaceSources.postDetail, /operator read/);
assert.match(publicSurfaceSources.postDetail, /post\.yaml/);
assert.match(publicSurfaceSources.postDetail, /wordCount/);
assert.match(publicSurfaceSources.about, /What I’m building/);
assert.match(publicSurfaceSources.about, /How to read this site/);

console.log("PASS terminal brand surfaces");
