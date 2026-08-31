/* eslint-disable no-console */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.argv[2] ?? ".env");
const distPath = resolve(process.argv[3] ?? "dist");
const requiredKeys = ["PUBLIC_GA_MEASUREMENT_ID", "PUBLIC_GOOGLE_SITE_VERIFICATION"];

function fail(message) {
  console.error(`Built public environment verification failed: ${message}`);
  process.exit(1);
}

function parseEnv(source) {
  const values = new Map();
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;

    let value = match[2];
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "");
    }
    values.set(match[1], value);
  }
  return values;
}

function distContains(directory, expected) {
  for (const entry of readdirSync(directory)) {
    const path = resolve(directory, entry);
    if (statSync(path).isDirectory()) {
      if (distContains(path, expected)) return true;
    } else if (readFileSync(path).includes(expected)) {
      return true;
    }
  }
  return false;
}

if (!existsSync(envPath)) fail("environment input is missing");
if (!existsSync(distPath)) fail("dist output is missing");

const values = parseEnv(readFileSync(envPath, "utf8"));
for (const key of requiredKeys) {
  const value = values.get(key);
  if (!value) fail(`${key} is missing or empty in the build environment`);
  if (!distContains(distPath, value)) fail(`${key} is absent from dist`);
  console.log(`Verified ${key} is present in dist`);
}
