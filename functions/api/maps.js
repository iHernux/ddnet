const UPSTREAM_URL = 'https://ddnet.org/releases/maps.json';
const CACHE_CONTROL = 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(payload, status, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function normalizeMap(m) {
  const name = typeof m?.name === 'string' ? m.name.trim() : '';
  if (!name) return null;

  return {
    name,
    mapper: typeof m.mapper === 'string' ? m.mapper : '',
    type: typeof m.type === 'string' && m.type ? m.type : 'Other',
    difficulty: typeof m.difficulty === 'number' && Number.isFinite(m.difficulty) ? m.difficulty : 0,
    points: typeof m.points === 'number' && Number.isFinite(m.points) ? m.points : 0,
    release: typeof m.release === 'string' ? m.release : '',
    width: typeof m.width === 'number' && Number.isFinite(m.width) ? m.width : 0,
    height: typeof m.height === 'number' && Number.isFinite(m.height) ? m.height : 0,
    tiles: Array.isArray(m.tiles) ? m.tiles : [],
    thumbnail: typeof m.thumbnail === 'string' ? m.thumbnail : '',
    website:
      typeof m.website === 'string' && m.website
        ? m.website
        : `https://ddnet.org/maps/${encodeURIComponent(name)}`,
    webPreview: typeof m.web_preview === 'string' ? m.web_preview : '',
  };
}

/**
 * Fetches and normalizes the official DDNet map catalog with Cloudflare Edge caching.
 */
export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405, { 'Cache-Control': 'no-store' });
  }

  const url = new URL(request.url);
  const bypassCache = url.searchParams.get('refresh') === '1';
  const edgeCache = typeof caches !== 'undefined' && caches.default ? caches.default : null;
  const cacheKey = new Request(`${url.origin}/api/maps`, { method: 'GET' });

  if (edgeCache && !bypassCache) {
    const cached = await edgeCache.match(cacheKey);
    if (cached) return cached;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const upstream = await fetch(UPSTREAM_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'DDNet-Archive/2.0',
        Accept: 'application/json',
      },
    });

    if (!upstream.ok) {
      return jsonResponse(
        { error: 'Upstream map catalog error', status: upstream.status },
        upstream.status >= 500 ? 502 : upstream.status,
        { 'Cache-Control': 'no-cache' }
      );
    }

    const raw = await upstream.json();
    if (!Array.isArray(raw)) {
      return jsonResponse({ error: 'Invalid upstream catalog format' }, 502, {
        'Cache-Control': 'no-cache',
      });
    }

    const maps = [];
    for (const entry of raw) {
      const normalized = normalizeMap(entry);
      if (normalized) maps.push(normalized);
    }

    const payload = {
      fetchedAt: new Date().toISOString(),
      lastModified: upstream.headers.get('last-modified') || null,
      count: maps.length,
      maps,
    };

    const response = jsonResponse(payload, 200, { 'Cache-Control': CACHE_CONTROL });

    if (edgeCache) {
      const putPromise = edgeCache.put(cacheKey, response.clone());
      if (typeof context.waitUntil === 'function') {
        context.waitUntil(putPromise);
      } else {
        await putPromise;
      }
    }

    return response;
  } catch (error) {
    if (error && error.name === 'AbortError') {
      return jsonResponse({ error: 'Request timeout', status: 504 }, 504, {
        'Cache-Control': 'no-cache',
      });
    }
    return jsonResponse({ error: 'Failed to fetch map catalog', status: 502 }, 502, {
      'Cache-Control': 'no-cache',
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
