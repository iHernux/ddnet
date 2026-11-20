const SERVERS_URL = 'https://master1.ddnet.org/ddnet/15/servers.json';
const CACHE_CONTROL = 'public, max-age=30, s-maxage=60, stale-while-revalidate=120';

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
 * Aggregates live server & online player counts from DDNet's official master server list.
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
  const edgeCache = typeof caches !== 'undefined' && caches.default ? caches.default : null;
  const cacheKey = new Request(`${url.origin}/api/online`, { method: 'GET' });

  if (edgeCache) {
    const cached = await edgeCache.match(cacheKey);
    if (cached) return cached;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const upstream = await fetch(SERVERS_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'DDNet-Archive/2.0',
        Accept: 'application/json',
      },
    });

    if (!upstream.ok) {
      return jsonResponse(
        { error: 'Master server API error', status: upstream.status },
        upstream.status >= 500 ? 502 : upstream.status,
        { 'Cache-Control': 'no-cache' }
      );
    }

    const data = await upstream.json();
    const servers = Array.isArray(data?.servers) ? data.servers : [];

    let totalServers = 0;
    let totalPlayers = 0;
    let ddnetServers = 0;
    let ddnetPlayers = 0;
    const mapStats = new Map();

    for (const server of servers) {
      totalServers += 1;
      const clients = Array.isArray(server?.info?.clients) ? server.info.clients.length : 0;
      totalPlayers += clients;

      if (server?.community === 'ddnet') {
        ddnetServers += 1;
        ddnetPlayers += clients;

        const mapName = typeof server?.info?.map?.name === 'string' ? server.info.map.name.trim() : '';
        if (mapName && clients > 0) {
          const entry = mapStats.get(mapName);
          if (entry) {
            entry.players += clients;
            entry.servers += 1;
          } else {
            mapStats.set(mapName, { name: mapName, players: clients, servers: 1 });
          }
        }
      }
    }

    const topMaps = Array.from(mapStats.values())
      .sort((a, b) => b.players - a.players || b.servers - a.servers || a.name.localeCompare(b.name))
      .slice(0, 12);

    const payload = {
      ddnetPlayers,
      ddnetServers,
      totalPlayers,
      totalServers,
      topMaps,
      updatedAt: new Date().toISOString(),
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
    return jsonResponse({ error: 'Failed to fetch online stats', status: 502 }, 502, {
      'Cache-Control': 'no-cache',
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
