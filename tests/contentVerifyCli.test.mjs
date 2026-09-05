/* eslint-disable no-console */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tsxCli = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
const verifyScript = path.join(root, "scripts", "content-verify.mjs");

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(error);
  }
}

function runVerify(args, environment = {}) {
  const env = { ...process.env, ...environment };
  delete env.X_API_KEY;
  return spawnSync(
    process.execPath,
    [tsxCli, verifyScript, "--source", "filesystem", "--destination", "object", ...args],
    {
      cwd: root,
      env,
      encoding: "utf8",
    }
  );
}

test("full verification fails before storage access when base URL is omitted", () => {
  const result = runVerify(["--api-key-env", "VERIFICATION_TEST_API_KEY"], {
    VERIFICATION_TEST_API_KEY: "test-placeholder-not-a-real-secret",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--base-url is required/);
  assert.doesNotMatch(result.stderr, /CONTENT_OBJECT_BUCKET/);
});

test("full verification fails before storage access when API credential input is omitted", () => {
  const result = runVerify(["--base-url", "https://example.invalid/"]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--api-key-env is required/);
  assert.doesNotMatch(result.stderr, /CONTENT_OBJECT_BUCKET/);
});

test("full verification fails before storage access when the named API credential is unavailable", () => {
  const result = runVerify([
    "--base-url",
    "https://example.invalid/",
    "--api-key-env",
    "VERIFICATION_TEST_MISSING_API_KEY",
  ]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /VERIFICATION_TEST_MISSING_API_KEY is not set/);
  assert.doesNotMatch(result.stderr, /CONTENT_OBJECT_BUCKET/);
});

test("the package verification command supplies explicit live and API prerequisites", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

  assert.match(packageJson.scripts["content:verify"], /--base-url https:\/\/berryhill\.dev\//);
  assert.match(packageJson.scripts["content:verify"], /--api-key-env X_API_KEY/);
});

console.log(`content verify CLI: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
