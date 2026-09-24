import assert from "node:assert/strict";
import { test } from "node:test";
import { GoogleAuth, OAuth2Client } from "google-auth-library";
import { submitSitemapToGoogleSearchConsole as submit } from "../src/utils/googleSearchConsole.ts";

// Never resolve credentials from the host during tests.
for (const key of ["GOOGLE_APPLICATION_CREDENTIALS", "GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN", "GOOGLE_SEARCH_CONSOLE_SITE_URL", "GOOGLE_SEARCH_CONSOLE_SITEMAP_URL"]) delete process.env[key];

test("defaults to the verified domain property and classifies acceptance separately from indexing", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      assert.match(String(url), /sites\/sc-domain%3Aberryhill.dev\/sitemaps\//);
      assert.equal(init.method, "PUT");
      assert.ok(init.signal);
      return new Response(null, { status: 204 });
    };
    assert.deepEqual(await submit({ accessToken: "test-token" }), { ok: true, status: 204 });
  } finally { globalThis.fetch = original; }
});

test("service-account path uses Google's refresh-capable auth client with scoped, bounded requests", async () => {
  const original = GoogleAuth.prototype.getClient;
  process.env.GOOGLE_APPLICATION_CREDENTIALS = "/not-read/test-service-account.json";
  let requests = 0;
  try {
    GoogleAuth.prototype.getClient = async function () {
      assert.equal(this.keyFilename, "/not-read/test-service-account.json");
      assert.deepEqual(this.scopes, ["https://www.googleapis.com/auth/webmasters"]);
      assert.equal(this.clientOptions.transporterOptions.timeout, 10000);
      assert.equal(this.clientOptions.transporterOptions.retry, false);
      assert.ok(this.clientOptions.transporterOptions.signal);
      return { request: async options => {
        requests++;
        assert.equal(options.method, "PUT");
        assert.equal(options.timeout, 10000);
        assert.ok(options.signal);
        return { status: 204 };
      } };
    };
    assert.deepEqual(await submit(), { ok: true, status: 204 });
    assert.deepEqual(await submit(), { ok: true, status: 204 });
    assert.equal(requests, 2);
  } finally {
    GoogleAuth.prototype.getClient = original;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
});

test("a configured service-account mount wins over a legacy static environment token", async () => {
  const original = GoogleAuth.prototype.getClient;
  const originalFetch = globalThis.fetch;
  process.env.GOOGLE_APPLICATION_CREDENTIALS = "/not-read/test-service-account.json";
  process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN = "stale-test-token";
  let requests = 0;
  try {
    globalThis.fetch = async () => { throw new Error("stale token path selected"); };
    GoogleAuth.prototype.getClient = async function () {
      assert.equal(this.keyFilename, "/not-read/test-service-account.json");
      return { request: async () => { requests++; return { status: 204 }; } };
    };
    assert.deepEqual(await submit(), { ok: true, status: 204 });
    assert.equal(requests, 1);
  } finally {
    GoogleAuth.prototype.getClient = original;
    globalThis.fetch = originalFetch;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN;
  }
});

test("Google's real OAuth client refreshes expired credentials rather than reusing a stale token", async () => {
  const original = GoogleAuth.prototype.getClient;
  process.env.GOOGLE_APPLICATION_CREDENTIALS = "/not-read/test-service-account.json";
  const client = new OAuth2Client();
  let refreshes = 0;
  client.refreshHandler = async () => {
    refreshes++;
    return { access_token: `test-refreshed-${refreshes}`, expiry_date: Date.now() + 3600000 };
  };
  client.transporter.request = async options => {
    assert.equal(options.headers.get("authorization"), `Bearer test-refreshed-${refreshes}`);
    return { status: 204 };
  };
  try {
    GoogleAuth.prototype.getClient = async () => client;
    assert.equal((await submit()).ok, true);
    client.credentials.expiry_date = 1;
    assert.equal((await submit()).ok, true);
    assert.equal(refreshes, 2);
  } finally {
    GoogleAuth.prototype.getClient = original;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
});

test("errors expose only fixed classifications, never provider messages, request config or bodies", async () => {
  const original = globalThis.fetch;
  try {
    for (const [status, reason] of [[401, "authentication_failed"], [403, "authorization_failed"], [429, "transient_google_error"], [503, "transient_google_error"], [400, "google_request_rejected"]]) {
      globalThis.fetch = async () => new Response("untrusted upstream details", { status });
      assert.deepEqual(await submit({ accessToken: "test-token" }), { ok: false, status, reason });
    }
    globalThis.fetch = async () => { throw new Error("untrusted upstream details"); };
    assert.deepEqual(await submit({ accessToken: "test-token" }), { ok: false, reason: "network_error" });
    assert.deepEqual(await submit({ accessToken: "test-token", siteUrl: "invalid" }), { ok: false, reason: "invalid_config" });
  } finally { globalThis.fetch = original; }
});

test("missing config and credential loading failure are distinct; no implicit host ADC lookup", async () => {
  assert.deepEqual(await submit(), { ok: false, skipped: true, reason: "missing_config: GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN" });
  const original = GoogleAuth.prototype.getClient;
  process.env.GOOGLE_APPLICATION_CREDENTIALS = "/not-read/test-service-account.json";
  try {
    GoogleAuth.prototype.getClient = async () => { throw new Error("untrusted credential details"); };
    assert.deepEqual(await submit(), { ok: false, reason: "credential_error" });
  } finally {
    GoogleAuth.prototype.getClient = original;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
});

test("submission deadline bounds even a stalled fetch or credential loader", async () => {
  const originalFetch = globalThis.fetch;
  const originalClient = GoogleAuth.prototype.getClient;
  try {
    globalThis.fetch = () => new Promise(() => {});
    assert.deepEqual(await submit({ accessToken: "test-token", timeoutMs: 10 }), { ok: false, reason: "timeout" });
    process.env.GOOGLE_APPLICATION_CREDENTIALS = "/not-read/test-service-account.json";
    GoogleAuth.prototype.getClient = () => new Promise(() => {});
    assert.deepEqual(await submit({ timeoutMs: 10 }), { ok: false, reason: "timeout" });
  } finally {
    globalThis.fetch = originalFetch;
    GoogleAuth.prototype.getClient = originalClient;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
});
