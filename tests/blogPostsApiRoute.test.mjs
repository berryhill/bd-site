/* eslint-disable no-console */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
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
const storePath = await fs.mkdtemp(path.join(os.tmpdir(), "bd-posts-api-"));
const apiKey = randomUUID();
const output = [];
const child = spawn(
  "pnpm",
  ["exec", "astro", "dev", "--host", "127.0.0.1", "--port", String(port)],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      CONTENT_STORAGE_FILESYSTEM_PATH: storePath,
      ENV: "workstation",
      X_API_KEY: apiKey,
    },
    stdio: ["ignore", "pipe", "pipe"],
  }
);
child.stdout.on("data", chunk => output.push(chunk.toString()));
child.stderr.on("data", chunk => output.push(chunk.toString()));

const request = (method, body) =>
  fetch(new URL("/api/posts", origin), {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

try {
  await waitForServer(origin, child, output);

  const create = await request("POST", {
    title: "PATCH Retry Route Fixture",
    description: "Initial fixture",
    content: "Draft fixture body.",
    draft: true,
    operationId: "create-patch-retry-route-fixture",
  });
  const createText = await create.text();
  assert.equal(create.status, 201, createText);
  const created = JSON.parse(createText);

  const mutation = {
    slug: created.slug,
    description: "Updated once",
    draft: true,
    expectedRevision: created.revision,
    operationId: "update-patch-retry-route-fixture",
  };
  const first = await request("PATCH", mutation);
  const firstText = await first.text();
  assert.equal(first.status, 200, firstText);
  const firstBody = JSON.parse(firstText);

  const retry = await request("PATCH", mutation);
  const retryText = await retry.text();
  assert.equal(retry.status, 200, retryText);
  const retryBody = JSON.parse(retryText);
  assert.deepEqual(retryBody, firstBody);

  console.log("PASS 1 FAIL 0");
} finally {
  child.kill("SIGTERM");
  await fs.rm(storePath, { recursive: true, force: true });
}
