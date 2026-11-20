const PROFILE_CACHE_CONTROL = 'public, max-age=60, s-maxage=120, stale-while-revalidate=300';
const QUERY_CACHE_CONTROL = 'public, max-age=60, s-maxage=120';

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

async function fetchJsonWithTimeout(targetUrl, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'DDNet-Archive/2.0',
        Accept: 'application/json',
      },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function putEdgeCache(context, edgeCache, cacheKey, response) {
  if (!edgeCache) return;
  const putPromise = edgeCache.put(cacheKey, response.clone());
  if (typeof context.waitUntil === 'function') {
    context.waitUntil(putPromise);
  } else {
    await putPromise;
  }
}

/**
 * Proxies DDNet player autocomplete (?query=...) and full player profiles (?name=...).
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
  const hasQuery = url.searchParams.has('query');
  const hasName = url.searchParams.has('name');
  const edgeCache = typeof caches !== 'undefined' && caches.default ? caches.default : null;

  if (hasQuery && !hasName) {
    const query = (url.searchParams.get('query') || '').trim();
    if (!query) {
      return jsonResponse({ error: 'Missing query parameter' }, 400, {
        'Cache-Control': 'no-store',
      });
    }

    const cacheKey = new Request(`${url.origin}/api/player?query=${encodeURIComponent(query)}`, {
      method: 'GET',
    });
    if (edgeCache) {
      const cached = await edgeCache.match(cacheKey);
      if (cached) return cached;
    }

    try {
      const upstream = await fetchJsonWithTimeout(
        `https://ddnet.org/players/?query=${encodeURIComponent(query)}`,
        6000
      );

      if (!upstream.ok) {
        return jsonResponse(
          { error: 'API error', status: upstream.status },
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
      const suggestions = Array.isArray(data)
        ? data
            .slice(0, 12)
            .filter((item) => item && typeof item.name === 'string' && item.name.trim())
            .map((item) => ({
              name: item.name,
              points: typeof item.points === 'number' ? item.points : 0,
            }))
        : [];

      const response = jsonResponse(suggestions, 200, { 'Cache-Control': QUERY_CACHE_CONTROL });
      await putEdgeCache(context, edgeCache, cacheKey, response);
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
    }
  }

  const playerName = (url.searchParams.get('name') || '').trim();
  if (!playerName) {
    return jsonResponse({ error: 'Missing name or query parameter' }, 400, {
      'Cache-Control': 'no-store',
    });
  }

  const cacheKey = new Request(`${url.origin}/api/player?name=${encodeURIComponent(playerName)}`, {
    method: 'GET',
  });
  if (edgeCache) {
    const cached = await edgeCache.match(cacheKey);
    if (cached) return cached;
  }

  try {
    const upstream = await fetchJsonWithTimeout(
      `https://ddnet.org/players/?json2=${encodeURIComponent(playerName)}`,
      8000
    );

    if (upstream.status === 404) {
      return jsonResponse({ error: 'Player not found', status: 404 }, 404, {
        'Cache-Control': 'public, max-age=60',
      });
    }

    if (!upstream.ok) {
      return jsonResponse(
        { error: 'API error', status: upstream.status },
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
    // DDNet returns HTTP 200 with {} when a player does not exist
    if (!data || typeof data !== 'object' || !data.player) {
      return jsonResponse({ error: 'Player not found', status: 404 }, 404, {
        'Cache-Control': 'public, max-age=60',
      });
    }

    const response = jsonResponse(data, 200, { 'Cache-Control': PROFILE_CACHE_CONTROL });
    await putEdgeCache(context, edgeCache, cacheKey, response);
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
  }
}
