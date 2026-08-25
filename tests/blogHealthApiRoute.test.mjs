/* eslint-disable no-console */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const wait = milliseconds =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

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

async function withServer(environment, verify) {
  const port = await getFreePort();
  const origin = `http://127.0.0.1:${port}`;
  const apiKey = randomUUID();
  const output = [];
  const child = spawn(
    "pnpm",
    ["exec", "astro", "dev", "--host", "127.0.0.1", "--port", String(port)],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ENV: "workstation",
        X_API_KEY: apiKey,
        ...environment,
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  child.stdout.on("data", chunk => output.push(chunk.toString()));
  child.stderr.on("data", chunk => output.push(chunk.toString()));

  try {
    const deadline = Date.now() + 60_000;
    let ready = false;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) {
        throw new Error(`Astro exited with ${child.exitCode}: ${output.join("")}`);
      }
      try {
        await fetch(origin);
        ready = true;
        break;
      } catch {
        await wait(200);
      }
    }
    if (!ready) throw new Error(`Timed out waiting for Astro: ${output.join("")}`);
    await verify({ origin, apiKey });
  } finally {
    child.kill("SIGTERM");
  }
}

async function readHealth(origin, apiKey) {
  const response = await fetch(new URL("/api/health", origin), {
    headers: apiKey ? { "x-api-key": apiKey } : {},
  });
  return { response, body: await response.json() };
}

async function withEmptyObjectStore(verify) {
  const server = http.createServer((request, response) => {
    if (request.method === "HEAD") {
      response.writeHead(200, { "x-amz-request-id": randomUUID() });
      response.end();
      return;
    }
    response.writeHead(404, {
      "Content-Type": "application/xml",
      "x-amz-request-id": randomUUID(),
    });
    response.end(
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Error><Code>NoSuchKey</Code><Message>Not found</Message></Error>"
    );
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  try {
    await verify(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) =>
      server.close(error => (error ? reject(error) : resolve()))
    );
  }
}

const filesystemPath = await fs.mkdtemp(path.join(os.tmpdir(), "bd-health-"));
const runtimeCredentialFile = path.join(filesystemPath, "sdk-credentials");
await fs.writeFile(
  runtimeCredentialFile,
  `[health]\naws_access_key_id=${randomUUID().replaceAll("-", "")}\naws_secret_access_key=${randomUUID().replaceAll("-", "")}${randomUUID().replaceAll("-", "")}\n`,
  { mode: 0o600 }
);
try {
  await withServer(
    {
      CONTENT_STORAGE_MODE: "filesystem",
      CONTENT_STORAGE_FILESYSTEM_PATH: filesystemPath,
    },
    async ({ origin, apiKey }) => {
      const unauthorized = await readHealth(origin);
      assert.equal(unauthorized.response.status, 401);

      const { response, body } = await readHealth(origin, apiKey);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "application/json");
      assert.deepEqual(body, {
        status: "healthy",
        message: "API is operational",
        storage: { provider: "filesystem", ready: true },
      });
      assert.doesNotMatch(JSON.stringify(body), new RegExp(filesystemPath));
    }
  );

  await withEmptyObjectStore(async endpoint => {
    await withServer(
      {
        CONTENT_STORAGE_MODE: "object",
        CONTENT_OBJECT_ENDPOINT: endpoint,
        CONTENT_OBJECT_BUCKET: `health-${randomUUID()}`,
        CONTENT_OBJECT_FORCE_PATH_STYLE: "true",
        CONTENT_OBJECT_REQUEST_TIMEOUT_MS: "1000",
        CONTENT_OBJECT_MAX_ATTEMPTS: "1",
        AWS_SHARED_CREDENTIALS_FILE: runtimeCredentialFile,
        AWS_PROFILE: "health",
      },
      async ({ origin, apiKey }) => {
        const { response, body } = await readHealth(origin, apiKey);
        assert.equal(response.status, 200);
        assert.deepEqual(body, {
          status: "healthy",
          message: "API is operational",
          storage: { provider: "object", ready: true },
        });
        assert.doesNotMatch(JSON.stringify(body), /127\.0\.0\.1|health-/);
      }
    );
  });

  for (const environment of [
    { CONTENT_STORAGE_MODE: "object", CONTENT_OBJECT_BUCKET: "" },
    {
      CONTENT_STORAGE_MODE: "object",
      CONTENT_OBJECT_BUCKET: "health-test",
      CONTENT_OBJECT_MAX_ATTEMPTS: "invalid",
    },
  ]) {
    await withServer(environment, async ({ origin, apiKey }) => {
      const { response, body } = await readHealth(origin, apiKey);
      assert.equal(response.status, 503);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(response.headers.get("retry-after"), "30");
      assert.equal(body.status, "unavailable");
      assert.equal(body.message, "Blog storage is unavailable");
      assert.deepEqual(body.storage, { provider: "object", ready: false });
    });
  }

  const unavailablePort = await getFreePort();
  await withServer(
    {
      CONTENT_STORAGE_MODE: "object",
      CONTENT_OBJECT_ENDPOINT: `http://127.0.0.1:${unavailablePort}`,
      CONTENT_OBJECT_BUCKET: "health-test",
      CONTENT_OBJECT_FORCE_PATH_STYLE: "true",
      CONTENT_OBJECT_REQUEST_TIMEOUT_MS: "100",
      CONTENT_OBJECT_MAX_ATTEMPTS: "1",
    },
    async ({ origin, apiKey }) => {
      const { response, body } = await readHealth(origin, apiKey);
      assert.equal(response.status, 503);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(response.headers.get("retry-after"), "30");
      assert.deepEqual(body, {
        status: "unavailable",
        message: "Blog storage is unavailable",
        storage: { provider: "object", ready: false },
      });
      assert.doesNotMatch(JSON.stringify(body), /health-test|127\.0\.0\.1/);
    }
  );
} finally {
  await fs.rm(filesystemPath, { recursive: true, force: true });
}

console.log("PASS 5 FAIL 0");
