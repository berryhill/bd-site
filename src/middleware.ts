import { defineMiddleware } from "astro:middleware";
import { getCanonicalHtmlRedirectLocation } from "@/utils/url";

const REDIRECT_STATUS = 301;

export const onRequest = defineMiddleware((context, next) => {
  const redirectLocation = getCanonicalHtmlRedirectLocation(
    context.request.method,
    context.request.url,
    context.request.headers.get("accept")
  );

  if (!redirectLocation) {
    return next();
  }

  return context.redirect(redirectLocation, REDIRECT_STATUS);
});
