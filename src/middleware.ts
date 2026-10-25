import { defineMiddleware } from "astro:middleware";
import { BlogStoreUnavailableError } from "@/content/blogStore";
import { storageUnavailableResponse } from "@/content/publicBlogReads";
import { SITE } from "@/config";
import {
  getCanonicalHtmlRedirectLocation,
  getPageOneArchiveRedirectLocation,
} from "@/utils/url";

const REDIRECT_STATUS = 301;

export const onRequest = defineMiddleware(async (context, next) => {
  try {
    const method = context.request.method;
    const requestUrl = context.request.url;
    const acceptHeader = context.request.headers.get("accept");

    const pageOneRedirect = getPageOneArchiveRedirectLocation(
      method,
      requestUrl,
      acceptHeader
    );

    if (pageOneRedirect) {
      return context.redirect(pageOneRedirect, REDIRECT_STATUS);
    }

    const redirectLocation = getCanonicalHtmlRedirectLocation(
      method,
      requestUrl,
      acceptHeader
    );

    if (!redirectLocation) {
      const response = await next();
      if (
        (method === "GET" || method === "HEAD") &&
        response.status === 200 &&
        response.headers.get("content-type")?.includes("text/html")
      ) {
        const headers = new Headers(response.headers);
        headers.append(
          "Link",
          `<${new URL("rss.xml", SITE.website).href}>; rel="alternate"; type="application/rss+xml"`
        );
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }
      return response;
    }

    return context.redirect(redirectLocation, REDIRECT_STATUS);
  } catch (error) {
    if (error instanceof BlogStoreUnavailableError) {
      return storageUnavailableResponse();
    }
    throw error;
  }
});
