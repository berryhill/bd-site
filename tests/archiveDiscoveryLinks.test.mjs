/* eslint-disable no-console */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SITE } from "../src/config.ts";
import { archivePageLinks } from "../src/utils/archivePageLinks.ts";

const archive = readFileSync(new URL("../src/components/TerminalPostsArchive.astro", import.meta.url), "utf8");

assert.deepEqual(archivePageLinks(0, SITE.postPerPage), [{ page: 1, href: "/posts/" }]);
assert.deepEqual(archivePageLinks(SITE.postPerPage, SITE.postPerPage), [{ page: 1, href: "/posts/" }]);
const pages = archivePageLinks(SITE.postPerPage * 18 + 5, SITE.postPerPage);
assert.equal(pages.length, 19);
assert.deepEqual(pages[0], { page: 1, href: "/posts/" });
assert.deepEqual(pages.at(-1), { page: 19, href: "/posts/page/19/" });
assert.ok(pages.every(({ href }) => href.endsWith("/") && !href.includes("/page/1/")));
assert.match(archive, /archivePageLinks\(sortedPosts\.length, pageSize\)/);
assert.match(archive, /aria-label="Archive pages"/);
assert.match(archive, /archiveLinks\.map\(\(\{ page: pageNumber, href \}\) =>/);
assert.match(archive, /href=\{href\}/);
assert.match(archive, /aria-current=\{pageNumber === safePage \? "page" : undefined\}/);
console.log("PASS archive discovery links");
