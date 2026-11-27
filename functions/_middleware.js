import { SITE_ORIGIN } from './_shared/seo.js';

const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function applySecurityHeaders(headers, pathname) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  if (pathname.startsWith('/api/')) {
    headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return headers;
}

/**
 * Global Cloudflare Pages middleware:
 * - Server-side HTTP 301 redirect from exact ddnet.pages.dev and www.ddnet-archive.xyz to https://ddnet-archive.xyz
 *   (preserves branch preview subdomains like feature.ddnet.pages.dev and localhost)
 * - Blocks direct HTTP access to internal _shared helper modules
 * - Attaches security headers on all responses and X-Robots-Tag on /api/* responses
 */
export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname === 'ddnet.pages.dev' || url.hostname === 'www.ddnet-archive.xyz') {
    const target = `${SITE_ORIGIN}${url.pathname}${url.search}`;
    const headers = applySecurityHeaders(new Headers({ Location: target }), url.pathname);
    return new Response(null, { status: 301, headers });
  }

  if (url.pathname === '/_shared' || url.pathname.startsWith('/_shared/')) {
    const headers = applySecurityHeaders(new Headers({ 'Content-Type': 'text/plain; charset=utf-8' }), url.pathname);
    return new Response('Not Found', { status: 404, headers });
  }

  const res = await context.next();
  const headers = applySecurityHeaders(new Headers(res.headers), url.pathname);
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}
