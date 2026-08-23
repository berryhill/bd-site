import { defineMiddleware } from "astro:middleware";
import {
  getCanonicalHtmlRedirectLocation,
  getPageOneArchiveRedirectLocation,
} from "@/utils/url";

const REDIRECT_STATUS = 301;

export const onRequest = defineMiddleware((context, next) => {
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
    return next();
  }

  return context.redirect(redirectLocation, REDIRECT_STATUS);
});
