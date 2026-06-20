#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs/promises";
import { validateSocialPreviewMetadata } from "../src/utils/socialPreviewMeta.ts";

function printUsage() {
  console.error(`Usage: pnpm run check:social-preview -- <post-url-or-html-file>

Examples:
  pnpm run build && pnpm run preview
  pnpm run check:social-preview -- http://localhost:4321/posts/my-post/
  pnpm run check:social-preview -- dist/client/posts/my-post/index.html

Checks: <title>, meta description, og:title, og:description, og:image,
twitter:card, twitter:title, twitter:description, and twitter:image.`);
}

async function readHtml(source) {
  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source, { redirect: "follow" });

    if (!response.ok) {
      throw new Error(`Fetch failed for ${source}: ${response.status} ${response.statusText}`);
    }

    return response.text();
  }

  return fs.readFile(source, "utf8");
}

function printResult(source, result) {
  console.log(`Social preview readback for ${source}`);
  console.log(JSON.stringify(result.metadata, null, 2));

  if (result.valid) {
    console.log("PASS social preview metadata is complete and internally consistent");
    return;
  }

  console.error("FAIL social preview metadata issues:");
  for (const issue of result.issues) {
    console.error(`- ${issue.field}: ${issue.reason}`);
  }
}

const args = process.argv.slice(2).filter(arg => arg !== "--");
const source = args[0];

if (!source || source === "--help" || source === "-h") {
  printUsage();
  process.exitCode = source ? 0 : 1;
} else {
  try {
    const html = await readHtml(source);
    const result = validateSocialPreviewMetadata(html);
    printResult(source, result);

    if (!result.valid) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
