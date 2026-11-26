import { CORS_HEADERS, jsonResponse } from '../_shared/live.js';

const USER_AGENT = 'DDNet-Archive/2.2';
const CACHE_CONTROL = 'public, max-age=86400, s-maxage=604800';
const UPSTREAM_TIMEOUT_MS = 15000;

function sanitizeSkinName(raw) {
  const name = String(raw || '').trim();
  if (!name || name.length > 120) return '';
  if (
    name.includes('/') ||
    name.includes('\\') ||
    name.includes('..') ||
    /[\x00-\x1f\x7f]/.test(name)
  ) {
    return '';
  }
  return name;
}

function buildUpstreamUrl(name, type, uhd) {
  const encoded = encodeURIComponent(name);
  const hdPrefix = uhd ? 'uhd/' : '';
  const typePrefix = type === 'community' ? 'community/' : '';
  return `https://skins.ddnet.org/skin/${hdPrefix}${typePrefix}${encoded}.png`;
}

async function fetchUpstreamPng(targetUrl, method) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(targetUrl, {
      method: method === 'HEAD' ? 'HEAD' : 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) {
      await res.body?.cancel?.().catch(() => {});
      return { ok: false, status: res.status };
    }
    if (method === 'HEAD') {
      return { ok: true, status: 200, bytes: null, headers: res.headers };
    }
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    if (
      bytes.length < 8 ||
      bytes[0] !== 0x89 ||
      bytes[1] !== 0x50 ||
      bytes[2] !== 0x4e ||
      bytes[3] !== 0x47
    ) {
      return { ok: false, status: 502 };
    }
    return { ok: true, status: 200, bytes, headers: res.headers };
  } catch (err) {
    return { ok: false, status: err?.name === 'AbortError' ? 504 : 502 };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const url = new URL(request.url);
  const name = sanitizeSkinName(url.searchParams.get('name'));
  if (!name) {
    return jsonResponse({ error: 'Invalid skin name' }, 400);
  }

  const type = url.searchParams.get('type') === 'community' ? 'community' : 'normal';
  const uhd = url.searchParams.get('uhd') === '1';
  const download = url.searchParams.get('download') === '1';

  const cache = caches.default;
  const cacheKey = new Request(
    `${url.origin}/api/skin-image?name=${encodeURIComponent(name)}&type=${type}&uhd=${uhd ? '1' : '0'}`,
    { method: 'GET' }
  );

  let result = null;
  if (request.method === 'GET' && !download) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  }

  const primaryUrl = buildUpstreamUrl(name, type, uhd);
  result = await fetchUpstreamPng(primaryUrl, request.method);
  if (!result.ok && uhd && (result.status === 404 || result.status === 403)) {
    result = await fetchUpstreamPng(buildUpstreamUrl(name, type, false), request.method);
  }
  if (!result.ok) {
    return jsonResponse(
      { error: result.status === 404 ? 'Skin image not found' : 'Failed to fetch skin image' },
      result.status === 404 ? 404 : 502
    );
  }

  const asciiName =
    name.replace(/[^\x20-\x7E]|["\\/;]/g, '_').replace(/\s+/g, ' ').trim() || 'skin';
  const utf8Name = encodeURIComponent(`${name}.png`).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );

  const headers = new Headers({
    'Content-Type': 'image/png',
    'Cache-Control': CACHE_CONTROL,
    'X-Content-Type-Options': 'nosniff',
    ...CORS_HEADERS,
  });

  if (download) {
    headers.set(
      'Content-Disposition',
      `attachment; filename="${asciiName}.png"; filename*=UTF-8''${utf8Name}`
    );
  }

  const res = new Response(result.bytes, { status: 200, headers });
  if (request.method === 'GET' && !download) {
    context.waitUntil?.(cache.put(cacheKey, res.clone()));
  }
  return res;
}
