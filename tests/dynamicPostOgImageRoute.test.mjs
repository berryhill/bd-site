/* eslint-disable no-console */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import {
  extractSocialPreviewMetadata,
  validateSocialPreviewImageReachability,
} from "../src/utils/socialPreviewMeta.ts";

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(error);
  }
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer(origin, process, output) {
  const deadline = Date.now() + 60000;
  let lastError;

  while (Date.now() < deadline) {
    if (process.exitCode !== null) {
      throw new Error(
        `Astro dev server exited with ${process.exitCode}: ${output.join("")}`
      );
    }

    try {
      const response = await fetch(origin, { redirect: "manual" });
      if (response.status < 500) return;
    } catch (error) {
      lastError = error;
    }

    await wait(500);
  }

  throw new Error(
    `Timed out waiting for Astro dev server: ${String(lastError)}\n${output.join("")}`
  );
}

async function fetchImage(origin, pathname) {
  const response = await fetch(new URL(pathname, origin), {
    headers: { "User-Agent": "Twitterbot/1.0" },
  });
  const body = new Uint8Array(await response.arrayBuffer());
  return { response, body };
}

function assertPngCard(body) {
  assert.deepEqual(Array.from(body.slice(0, 8)), [
    137, 80, 78, 71, 13, 10, 26, 10,
  ]);

  const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
  assert.equal(view.getUint32(16), 1200);
  assert.equal(view.getUint32(20), 630);
}

const port = await getFreePort();
const origin = `http://127.0.0.1:${port}`;
const output = [];
const transitionSlug = "fresh-social-card-transition-fixture";
const transitionFixturePath = path.join(
  process.cwd(),
  "src",
  "data",
  "blog",
  `${transitionSlug}.md`
);
const server = spawn(
  "pnpm",
  ["exec", "astro", "dev", "--host", "127.0.0.1", "--port", String(port)],
  {
    env: { ...process.env, ENV: "workstation" },
    stdio: ["ignore", "pipe", "pipe"],
  }
);

server.stdout.on("data", data => output.push(data.toString()));
server.stderr.on("data", data => output.push(data.toString()));

try {
  await waitForServer(origin, server, output);

  await test("advertised social image resolves to a valid dynamic PNG", async () => {
    const pageUrl = `${origin}/posts/welcome-to-dynamic-blog/`;
    const pageResponse = await fetch(pageUrl, {
      headers: { "User-Agent": "Twitterbot/1.0" },
    });
    const html = await pageResponse.text();
    const metadata = extractSocialPreviewMetadata(html);

    assert.equal(pageResponse.status, 200);
    assert.equal(
      metadata.ogImage,
      "https://berryhill.dev/posts/welcome-to-dynamic-blog/index.png"
    );
    assert.equal(metadata.twitterImage, metadata.ogImage);

    const localImageUrl = new URL(new URL(metadata.ogImage).pathname, origin).href;
    const imageResult = await validateSocialPreviewImageReachability({
      ...metadata,
      ogImage: localImageUrl,
      twitterImage: localImageUrl,
    });
    const imageResponse = await fetch(localImageUrl, {
      headers: { "User-Agent": "Twitterbot/1.0" },
    });
    const imageBody = new Uint8Array(await imageResponse.arrayBuffer());

    assert.equal(imageResult.valid, true);
    assert.deepEqual(imageResult.issues, []);
    assert.equal(imageResponse.status, 200);
    assert.equal(imageResponse.headers.get("Content-Type"), "image/png");
    assertPngCard(imageBody);
  });

  await test("a second representative dynamic post resolves to a valid PNG", async () => {
    const { response, body } = await fetchImage(
      origin,
      "/posts/protocols-are-saturating-the-operators-gap-is-governance-not-transport/index.png"
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "image/png");
    assertPngCard(body);
  });

  await test("unknown dynamic post image slugs still return 404", async () => {
    const { response, body } = await fetchImage(
      origin,
      "/posts/not-a-real-post/index.png"
    );

    assert.equal(response.status, 404);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(body.length, 0);
  });

  await test("fresh post published after server startup is immediately Twitterbot card-ready", async () => {
    await writeFile(
      transitionFixturePath,
      `---
title: Fresh Social Card Transition Fixture
description: A regression fixture for first-crawl dynamic social card readiness.
pubDatetime: ${new Date().toISOString()}
featured: false
draft: false
tags:
  - agentic-dev
---

This fixture is written after the dev server starts so the test exercises the
fresh-publication transition path instead of an already-loaded collection entry.
`,
      "utf8"
    );

    const pageUrl = `${origin}/posts/${transitionSlug}/`;
    const pageResponse = await fetch(pageUrl, {
      headers: { "User-Agent": "Twitterbot/1.0" },
    });
    const html = await pageResponse.text();
    const metadata = extractSocialPreviewMetadata(html);

    assert.equal(pageResponse.status, 200);
    assert.equal(metadata.twitterCard, "summary_large_image");
    assert.equal(
      metadata.ogImage,
      `https://berryhill.dev/posts/${transitionSlug}/index.png`
    );
    assert.equal(metadata.twitterImage, metadata.ogImage);

    const imagePathname = new URL(metadata.ogImage).pathname;
    const { response, body } = await fetchImage(origin, imagePathname);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "image/png");
    assert.equal(
      response.headers.get("Cache-Control"),
      "public, max-age=31536000, immutable"
    );
    assert.equal(body.byteLength > 0, true);
    assertPngCard(body);
  });
} finally {
  server.kill("SIGTERM");
  await unlink(transitionFixturePath).catch(error => {
    if (error?.code !== "ENOENT") throw error;
  });
}

console.log(`PASS ${passed} FAIL ${failed}`);

if (failed > 0) {
  console.error(output.join(""));
  process.exitCode = 1;
}
