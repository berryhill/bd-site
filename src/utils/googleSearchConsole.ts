/* eslint-disable no-console */
// Server-only: imported by the public-post API, never by a client component.
import { GoogleAuth } from "google-auth-library";

export interface GoogleSearchConsoleSubmitResult {
  /** Google accepted the sitemap submission, NOT processing/indexing success. */
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  status?: number;
}

const ENDPOINT = "https://www.googleapis.com/webmasters/v3/sites";
const DEFAULT_PROPERTY = "sc-domain:berryhill.dev";
const DEFAULT_SITEMAP = "https://berryhill.dev/sitemap.xml";
const DEFAULT_TIMEOUT_MS = 10000;

const getEnv = (key: string) => process.env[key]?.trim() || undefined;

function normalizeSiteUrl(site: string): string {
  if (/^sc-domain:[a-z\d.-]+$/i.test(site)) return site;
  return normalizeHttpUrl(site);
}

function normalizeHttpUrl(value: string): string {
  const url = new URL(value);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new TypeError("invalid_config");
  }
  return url.toString();
}

function statusResult(status: number): GoogleSearchConsoleSubmitResult {
  if (status >= 200 && status < 300) return { ok: true, status };
  const reason =
    status === 401
      ? "authentication_failed"
      : status === 403
        ? "authorization_failed"
        : status === 429 || status >= 500
          ? "transient_google_error"
          : "google_request_rejected";
  return { ok: false, status, reason };
}

export async function submitSitemapToGoogleSearchConsole(options?: {
  sitemapUrl?: string;
  siteUrl?: string;
  /** Compatibility override; the caller owns refreshing this short-lived token. */
  accessToken?: string;
  timeoutMs?: number;
}): Promise<GoogleSearchConsoleSubmitResult> {
  const accessToken =
    options?.accessToken ?? getEnv("GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN");
  const keyFile = getEnv("GOOGLE_APPLICATION_CREDENTIALS");
  // Require explicit configuration: do not probe workstation ADC or metadata.
  if (!accessToken && !keyFile) {
    console.warn(
      "Google Search Console sitemap submission unavailable: missing_config"
    );
    return {
      ok: false,
      skipped: true,
      reason:
        "missing_config: GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN",
    };
  }

  let endpoint: string;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  try {
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000)
      throw new TypeError();
    const site = normalizeSiteUrl(
      options?.siteUrl ??
        getEnv("GOOGLE_SEARCH_CONSOLE_SITE_URL") ??
        DEFAULT_PROPERTY
    );
    const sitemap = normalizeHttpUrl(
      options?.sitemapUrl ??
        getEnv("GOOGLE_SEARCH_CONSOLE_SITEMAP_URL") ??
        DEFAULT_SITEMAP
    );
    endpoint = `${ENDPOINT}/${encodeURIComponent(site)}/sitemaps/${encodeURIComponent(sitemap)}`;
  } catch {
    return { ok: false, reason: "invalid_config" };
  }

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stage: "credential" | "request" = accessToken ? "request" : "credential";
  const deadline = new Promise<GoogleSearchConsoleSubmitResult>(resolve => {
    timer = setTimeout(() => {
      controller.abort();
      resolve({ ok: false, reason: "timeout" });
    }, timeoutMs);
  });

  const request = async (): Promise<GoogleSearchConsoleSubmitResult> => {
    try {
      if (accessToken) {
        const response = await fetch(endpoint, {
          method: "PUT",
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
          redirect: "error",
        });
        return statusResult(response.status);
      }
      // Google owns signing, token minting, expiry and refresh. A fresh client
      // per submission also reloads an operator-rotated projected credential file.
      // Bound BOTH token transport and sitemap transport, with no hidden retries.
      const auth = new GoogleAuth({
        keyFile,
        scopes: ["https://www.googleapis.com/auth/webmasters"],
        clientOptions: {
          transporterOptions: {
            timeout: timeoutMs,
            retry: false,
            signal: controller.signal,
            maxRedirects: 0,
          },
        },
      });
      const client = await auth.getClient();
      if (controller.signal.aborted) return { ok: false, reason: "timeout" };
      stage = "request";
      const response = await client.request({
        url: endpoint,
        method: "PUT",
        timeout: timeoutMs,
        retry: false,
        signal: controller.signal,
        maxRedirects: 0,
      });
      return statusResult(response.status);
    } catch (error) {
      // Never serialize messages, credentials, request config, URLs or bodies.
      if (controller.signal.aborted) return { ok: false, reason: "timeout" };
      const safeError = error as {
        response?: { status?: unknown };
        code?: unknown;
        name?: unknown;
      } | null;
      if (
        safeError?.code === "ETIMEDOUT" ||
        safeError?.name === "TimeoutError" ||
        safeError?.name === "AbortError"
      ) {
        return { ok: false, reason: "timeout" };
      }
      const status = safeError?.response?.status;
      if (
        typeof status === "number" &&
        Number.isInteger(status) &&
        status >= 400 &&
        status <= 599
      )
        return statusResult(status);
      return {
        ok: false,
        reason: stage === "credential" ? "credential_error" : "network_error",
      };
    }
  };

  try {
    const result = await Promise.race([request(), deadline]);
    if (!result.ok)
      console.warn("Google Search Console sitemap submission failed", result);
    return result;
  } finally {
    clearTimeout(timer);
  }
}
