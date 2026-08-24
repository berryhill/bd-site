import { defineMiddleware } from "astro:middleware";
import { BlogStoreUnavailableError } from "@/content/blogStore";
import { storageUnavailableResponse } from "@/content/publicBlogReads";
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
      return await next();
    }

    return context.redirect(redirectLocation, REDIRECT_STATUS);
  } catch (error) {
    if (error instanceof BlogStoreUnavailableError) {
      return storageUnavailableResponse();
    }
    throw error;
  }
});
