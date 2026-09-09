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

async function readProbe(origin, pathname, options = {}) {
  const headers = options.accept ? { accept: options.accept } : {};
  const response = await fetch(new URL(pathname, origin), {
    method: options.method ?? "GET",
    headers,
    redirect: "manual",
  });
  const text = await response.text();
  return { response, body: text ? JSON.parse(text) : null, text };
}

function assertDirectProbeResponse(probe, expectedStatus, label) {
  assert.equal(probe.response.status, expectedStatus, label);
  assert.equal(probe.response.headers.get("content-type"), "application/json", label);
  assert.equal(probe.response.headers.get("location"), null, label);
  assert.equal(probe.response.headers.get("cache-control"), "no-store", label);
  assert.ok(probe.text.length <= 4096, `${label} response body must remain bounded`);
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
      CONTENT_RESTORE_TIMESTAMP: "2026-01-01T00:00:00Z",
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
        storage: { mode: "filesystem", provider: "filesystem", ready: true },
      });
      assert.doesNotMatch(JSON.stringify(body), new RegExp(filesystemPath));

      for (const method of ["GET", "HEAD"]) {
        for (const accept of [undefined, "*/*", "application/json"]) {
          for (const pathname of ["/livez", "/readyz"]) {
            const label = `${method} ${pathname} accept=${accept ?? "unset"}`;
            const probe = await readProbe(origin, pathname, { method, accept });
            assertDirectProbeResponse(probe, 200, label);
            if (method === "HEAD") {
              assert.equal(probe.text, "", label);
            }
          }
        }
      }

      const live = await readProbe(origin, "/livez");
      assert.deepEqual(live.body, { status: "alive" });

      const ready = await readProbe(origin, "/readyz");
      assert.deepEqual(ready.body, {
        status: "ready",
        storage: {
          mode: "filesystem",
          provider: "filesystem",
          catalogGeneration: null,
          migrationState: "steady",
          writerEpoch: "1",
          casConflicts: 0,
          writeFrozen: false,
          mirrorLag: 0,
          parityMismatch: false,
          restoreTimestamp: "2026-01-01T00:00:00.000Z",
          ready: true,
        },
      });
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
          storage: { mode: "object", provider: "object", ready: true },
        });
        assert.doesNotMatch(JSON.stringify(body), /127\.0\.0\.1|health-/);

        const ready = await readProbe(origin, "/readyz");
        assert.equal(ready.response.status, 200);
        assert.equal(ready.body.storage.catalogGeneration, 0);
      }
    );

    await withServer(
      {
        CONTENT_STORAGE_MODE: "object",
        CONTENT_OBJECT_ENDPOINT: endpoint,
        CONTENT_OBJECT_BUCKET: `health-${randomUUID()}`,
        CONTENT_OBJECT_FORCE_PATH_STYLE: "true",
        CONTENT_OBJECT_REQUEST_TIMEOUT_MS: "1000",
        CONTENT_OBJECT_MAX_ATTEMPTS: "1",
        CONTENT_CATALOG_EXPECTED_GENERATION: "1",
        AWS_SHARED_CREDENTIALS_FILE: runtimeCredentialFile,
        AWS_PROFILE: "health",
      },
      async ({ origin }) => {
        assert.equal((await readProbe(origin, "/livez")).response.status, 200);
        assert.equal((await readProbe(origin, "/readyz")).response.status, 503);
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
      assert.deepEqual(body.storage, {
        mode: "object",
        provider: "object",
        ready: false,
      });
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
        storage: { mode: "object", provider: "object", ready: false },
      });
      assert.doesNotMatch(JSON.stringify(body), /health-test|127\.0\.0\.1/);

      const live = await readProbe(origin, "/livez");
      assert.equal(live.response.status, 200);
      assert.deepEqual(live.body, { status: "alive" });
      const ready = await readProbe(origin, "/readyz", { accept: "*/*" });
      assertDirectProbeResponse(ready, 503, "unavailable GET /readyz");
      assert.equal(ready.response.headers.get("retry-after"), "30");
      assert.deepEqual(ready.body, {
        status: "unavailable",
        storage: { ready: false },
      });
    }
  );

  for (const environment of [
    {
      CONTENT_STORAGE_MODE: "filesystem",
      CONTENT_STORAGE_FILESYSTEM_PATH: filesystemPath,
      CONTENT_MIGRATION_STATE: "cutover",
      CONTENT_MIGRATION_REQUIRED_STATE: "steady",
    },
    {
      CONTENT_STORAGE_MODE: "filesystem",
      CONTENT_STORAGE_FILESYSTEM_PATH: filesystemPath,
      CONTENT_WRITER_EPOCH: "2",
      CONTENT_WRITER_REQUIRED_EPOCH: "1",
    },
    {
      CONTENT_STORAGE_MODE: "filesystem",
      CONTENT_STORAGE_FILESYSTEM_PATH: filesystemPath,
      CONTENT_WRITE_FROZEN: "true",
    },
  ]) {
    await withServer(environment, async ({ origin, apiKey }) => {
      assert.equal((await readProbe(origin, "/livez")).response.status, 200);
      if (environment.CONTENT_WRITE_FROZEN !== "true") {
        assert.equal((await readProbe(origin, "/readyz")).response.status, 503);
      }
      const mutation = await fetch(new URL("/api/posts", origin), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({}),
      });
      assert.equal(mutation.status, 503);
    });
  }

  const oversizedDiagnostic = "x".repeat(4096);
  for (const { environment, rejectedValue } of [
    {
      environment: {
        CONTENT_MIGRATION_STATE: "token-like=value",
        CONTENT_MIGRATION_REQUIRED_STATE: "token-like=value",
      },
      rejectedValue: "token-like=value",
    },
    {
      environment: {
        CONTENT_MIGRATION_STATE: "steady\nspoofed",
        CONTENT_MIGRATION_REQUIRED_STATE: "steady\nspoofed",
      },
      rejectedValue: "steady\nspoofed",
    },
    {
      environment: {
        CONTENT_MIGRATION_STATE: oversizedDiagnostic,
        CONTENT_MIGRATION_REQUIRED_STATE: oversizedDiagnostic,
      },
      rejectedValue: oversizedDiagnostic,
    },
    {
      environment: {
        CONTENT_WRITER_EPOCH: "epoch-token-like-value",
        CONTENT_WRITER_REQUIRED_EPOCH: "epoch-token-like-value",
      },
      rejectedValue: "epoch-token-like-value",
    },
    {
      environment: {
        CONTENT_WRITER_EPOCH: oversizedDiagnostic,
        CONTENT_WRITER_REQUIRED_EPOCH: oversizedDiagnostic,
      },
      rejectedValue: oversizedDiagnostic,
    },
  ]) {
    await withServer(
      {
        CONTENT_STORAGE_MODE: "filesystem",
        CONTENT_STORAGE_FILESYSTEM_PATH: filesystemPath,
        ...environment,
      },
      async ({ origin, apiKey }) => {
        const ready = await readProbe(origin, "/readyz");
        assert.equal(ready.response.status, 503);
        assert.deepEqual(ready.body, {
          status: "unavailable",
          storage: { ready: false },
        });
        assert.doesNotMatch(JSON.stringify(ready.body), new RegExp(rejectedValue));

        const mutation = await fetch(new URL("/api/posts", origin), {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify({}),
        });
        assert.equal(mutation.status, 503);
      }
    );
  }

  for (const restoreTimestamp of [
    "credential-like=value",
    "2026-01-01T00:00:00Z\nspoofed",
    oversizedDiagnostic,
  ]) {
    await withServer(
      {
        CONTENT_STORAGE_MODE: "filesystem",
        CONTENT_STORAGE_FILESYSTEM_PATH: filesystemPath,
        CONTENT_RESTORE_TIMESTAMP: restoreTimestamp,
      },
      async ({ origin }) => {
        const ready = await readProbe(origin, "/readyz");
        assert.equal(ready.response.status, 200);
        assert.equal(ready.body.storage.restoreTimestamp, null);
        assert.doesNotMatch(
          JSON.stringify(ready.body),
          new RegExp(restoreTimestamp)
        );
      }
    );
  }

  for (const diagnosticEnvironment of [
    {
      CONTENT_MIRROR_LAG: "1e3",
      CONTENT_WRITE_FROZEN: "credential-like=value",
      CONTENT_PARITY_MISMATCH: "true\nspoofed",
    },
    {
      CONTENT_MIRROR_LAG: oversizedDiagnostic,
      CONTENT_WRITE_FROZEN: oversizedDiagnostic,
      CONTENT_PARITY_MISMATCH: oversizedDiagnostic,
    },
  ]) {
    await withServer(
      {
        CONTENT_STORAGE_MODE: "filesystem",
        CONTENT_STORAGE_FILESYSTEM_PATH: filesystemPath,
        ...diagnosticEnvironment,
      },
      async ({ origin, apiKey }) => {
        const ready = await readProbe(origin, "/readyz");
        assert.equal(ready.response.status, 200);
        assert.equal(ready.body.storage.mirrorLag, 0);
        assert.equal(ready.body.storage.writeFrozen, false);
        assert.equal(ready.body.storage.parityMismatch, false);
        for (const rawValue of Object.values(diagnosticEnvironment)) {
          assert.doesNotMatch(JSON.stringify(ready.body), new RegExp(rawValue));
        }

        for (const method of ["POST", "PATCH", "DELETE"]) {
          const mutation = await fetch(new URL("/api/posts", origin), {
            method,
            headers: {
              "content-type": "application/json",
              "x-api-key": apiKey,
            },
            body: method === "DELETE" ? undefined : JSON.stringify({}),
          });
          assert.equal(
            mutation.status,
            503,
            `${method} must fail closed for malformed write-freeze admission`
          );
        }
      }
    );
  }
} finally {
  await fs.rm(filesystemPath, { recursive: true, force: true });
}

console.log("PASS 5 FAIL 0");
