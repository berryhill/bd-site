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

for (const [name, path] of Object.entries(files)) {
  const source = readFileSync(path, "utf8");
  assert(!/views:\s*\d/i.test(source), `${name} must not contain fake views`);
  assert(!/live telemetry/i.test(source), `${name} must not claim live telemetry`);
  assert(!/agent count:\s*\d/i.test(source), `${name} must not invent agent counts`);
}

assert.match(readFileSync(files.styles, "utf8"), /\.terminal-shell/);
assert.match(readFileSync(files.styles, "utf8"), /\.operator-read/);
assert.match(readFileSync(files.home, "utf8"), /AI-native operating systems/);
assert.match(readFileSync(files.home, "utf8"), /Terminal metaphor\. Real claims only\./);
assert.match(readFileSync(files.posts, "utf8"), /Posts as artifacts/);
assert.match(readFileSync(files.posts, "utf8"), /group-by lane/);
assert.match(readFileSync(files.postDetail, "utf8"), /frontmatterPreview/);
assert.match(readFileSync(files.postDetail, "utf8"), /operator read/);
assert.match(readFileSync(files.postDetail, "utf8"), /post\.yaml/);
assert.match(readFileSync(files.about, "utf8"), /What I’m building/);
assert.match(readFileSync(files.about, "utf8"), /How to read this site/);

console.log("PASS terminal brand surfaces");
