import { SITE_ORIGIN } from './_shared/seo.js';

/**
 * Global Cloudflare Pages middleware:
 * - Server-side HTTP 301 redirect from exact ddnet.pages.dev to https://ddnet-archive.xyz
 *   (preserves branch preview subdomains like feature.ddnet.pages.dev and localhost)
 * - Blocks direct HTTP access to internal _shared helper modules
 */
export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname === 'ddnet.pages.dev') {
    const target = `${SITE_ORIGIN}${url.pathname}${url.search}`;
    return Response.redirect(target, 301);
  }

  if (url.pathname === '/_shared' || url.pathname.startsWith('/_shared/')) {
    return new Response('Not Found', { status: 404 });
  }

  return context.next();
}
