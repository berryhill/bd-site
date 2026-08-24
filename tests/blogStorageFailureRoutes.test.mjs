/* eslint-disable no-console */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import net from "node:net";

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

const wait = milliseconds =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

async function waitForServer(origin, child, output) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Astro exited with ${child.exitCode}: ${output.join("")}`);
    }
    try {
      await fetch(origin);
      return;
    } catch {
      await wait(250);
    }
  }
  throw new Error(`Timed out waiting for Astro: ${output.join("")}`);
}

const port = await getFreePort();
const origin = `http://127.0.0.1:${port}`;
const missingStore = path.join(
  os.tmpdir(),
  `bd-blog-store-unavailable-${process.pid}-${Date.now()}`
);
const output = [];
const child = spawn(
  "pnpm",
  ["exec", "astro", "dev", "--host", "127.0.0.1", "--port", String(port)],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      CONTENT_STORAGE_FILESYSTEM_PATH: missingStore,
      ENV: "workstation",
    },
    stdio: ["ignore", "pipe", "pipe"],
  }
);
child.stdout.on("data", chunk => output.push(chunk.toString()));
child.stderr.on("data", chunk => output.push(chunk.toString()));

const consumers = [
  "/",
  "/posts/",
  "/posts/2/",
  "/posts/welcome-to-dynamic-blog/",
  "/tags/",
  "/tags/ai/",
  "/rss.xml",
  "/atom.xml",
  "/sitemap-posts.xml",
  "/llms.txt",
  "/posts/welcome-to-dynamic-blog/index.png",
];

try {
  await waitForServer(origin, child, output);
  for (const pathname of consumers) {
    const response = await fetch(new URL(pathname, origin), { redirect: "manual" });
    assert.equal(response.status, 503, pathname);
    assert.equal(response.headers.get("cache-control"), "no-store", pathname);
    assert.equal(response.headers.get("retry-after"), "30", pathname);
    assert.match(
      await response.text(),
      /Blog storage is temporarily unavailable/,
      pathname
    );
  }
  console.log(`PASS ${consumers.length} FAIL 0`);
} finally {
  child.kill("SIGTERM");
}
