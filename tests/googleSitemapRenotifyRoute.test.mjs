/* eslint-disable no-console */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import net from "node:net";
import { readFileSync } from "node:fs";

const route = new URL("../src/pages/api/search-console/sitemap.ts", import.meta.url);
const source = readFileSync(route, "utf8");
assert.match(source, /requireApiKey\(context\)/);
assert.match(source, /submitSitemapToGoogleSearchConsole\(\)/);
assert.doesNotMatch(source, /request\.json\(|searchParams|getEnv\(/);

const port = await new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const value = server.address().port;
    server.close(() => resolve(value));
  });
});
const key = randomUUID();
const origin = `http://127.0.0.1:${port}`;
const child = spawn("pnpm", ["exec", "astro", "dev", "--host", "127.0.0.1", "--port", String(port)], {
  cwd: process.cwd(),
  env: { ...process.env, ENV: "workstation", X_API_KEY: key, GOOGLE_APPLICATION_CREDENTIALS: "", GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN: "" },
  detached: true,
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
child.stdout.on("data", chunk => { output += chunk.toString().slice(0, 1000); });
child.stderr.on("data", chunk => { output += chunk.toString().slice(0, 1000); });
const url = `${origin}/api/search-console/sitemap`;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  let ready = false;
  for (let i = 0; i < 200; i++) {
    if (child.exitCode !== null) throw new Error(`Astro exited: ${child.exitCode}`);
    try { await fetch(origin); ready = true; break; } catch { await wait(200); }
  }
  assert.ok(ready, `Astro did not start: ${output.slice(-1000)}`);
  const request = (method, headers = {}, path = url) => fetch(path, { method, headers, redirect: "manual" });
  for (const headers of [{}, { "x-api-key": "wrong" }]) {
    const response = await request("POST", headers);
    assert.equal(response.status, 401);
    assert.doesNotMatch(await response.text(), /credential_error|missing_config/);
  }
  const get = await request("GET", { "x-api-key": key });
  assert.notEqual(get.status, 200);
  const response = await request("POST", { "x-api-key": key }, `${url}?siteUrl=https://evil.example/&sitemapUrl=https://evil.example/x.xml`);
  assert.equal(response.status, 400);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { ok: false, reason: "unexpected_input" });
  const bodyResponse = await fetch(url, {
    method: "POST",
    headers: { "x-api-key": key, "content-type": "application/json", "Origin": origin },
    body: JSON.stringify({ siteUrl: "https://evil.example/" }),
  });
  assert.equal(bodyResponse.status, 400);
  assert.deepEqual(await bodyResponse.json(), { ok: false, reason: "unexpected_input" });
  const submitted = await request("POST", { "x-api-key": key });
  assert.equal(submitted.status, 503);
  assert.equal(submitted.headers.get("cache-control"), "no-store");
  assert.deepEqual(await submitted.json(), {
    ok: false, skipped: true,
    reason: "missing_config: GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN",
  });
  console.log("Google sitemap re-notification route: auth, fixed target, and missing configuration passed");
} finally {
  process.kill(-child.pid, "SIGTERM");
}
