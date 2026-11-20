const CACHE_CONTROL = 'public, max-age=120, s-maxage=300, stale-while-revalidate=600';

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

/**
 * Proxies map details & leaderboards from ddnet.org with Edge caching and empty-object 404 normalization.
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
  const name = (url.searchParams.get('name') || '').trim();
  if (!name) {
    return jsonResponse({ error: 'Missing map name' }, 400, { 'Cache-Control': 'no-store' });
  }

  const edgeCache = typeof caches !== 'undefined' && caches.default ? caches.default : null;
  const cacheKey = new Request(`${url.origin}/api/map?name=${encodeURIComponent(name)}`, {
    method: 'GET',
  });

  if (edgeCache) {
    const cached = await edgeCache.match(cacheKey);
    if (cached) return cached;
  }

  const ddnetUrl = `https://ddnet.org/maps/?json=${encodeURIComponent(name)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const upstream = await fetch(ddnetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'DDNet-Archive/2.0',
        Accept: 'application/json',
      },
    });

    if (upstream.status === 404) {
      return jsonResponse({ error: 'Map not found', status: 404 }, 404, {
        'Cache-Control': 'public, max-age=60',
      });
    }

    if (!upstream.ok) {
      return jsonResponse(
        { error: 'Upstream map API error', status: upstream.status },
        upstream.status >= 500 ? 502 : upstream.status,
        { 'Cache-Control': 'no-cache' }
      );
    }

    const contentType = upstream.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return jsonResponse({ error: 'Invalid response format' }, 502, {
        'Cache-Control': 'no-cache',
      });
    }

    const data = await upstream.json();
    // DDNet returns HTTP 200 with {} when a map does not exist
    if (!data || typeof data !== 'object' || !data.name) {
      return jsonResponse({ error: 'Map not found', status: 404 }, 404, {
        'Cache-Control': 'public, max-age=60',
      });
    }

    const response = jsonResponse(data, 200, { 'Cache-Control': CACHE_CONTROL });

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
    return jsonResponse({ error: 'Proxy error', status: 502 }, 502, {
      'Cache-Control': 'no-cache',
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
