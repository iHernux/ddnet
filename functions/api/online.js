import {
  CORS_HEADERS,
  fetchMasterSnapshot,
  jsonResponse,
  putEdgeCache,
} from '../_shared/live.js';

const CACHE_CONTROL = 'public, max-age=30, s-maxage=60, stale-while-revalidate=120';

/**
 * Aggregates live server & online player counts across DDNet and partner communities.
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

  try {
    const snapshot = await fetchMasterSnapshot(context, url.origin);

    const payload = {
      ddnetPlayers: snapshot.ddnetPlayers,
      ddnetServers: snapshot.ddnetServers,
      kogPlayers: snapshot.kogPlayers,
      kogServers: snapshot.kogServers,
      totalPlayers: snapshot.totalPlayers,
      totalServers: snapshot.totalServers,
      activeServers: snapshot.activeServers,
      topMaps: snapshot.ddnetTopMaps.slice(0, 12),
      topAllMaps: snapshot.liveMaps.slice(0, 15),
      communities: snapshot.communities.map((c) => ({
        id: c.id,
        name: c.name,
        shortName: c.shortName,
        icon: c.icon,
        servers: c.servers,
        activeServers: c.activeServers,
        players: c.players,
      })),
      updatedAt: snapshot.updatedAt,
    };

    const response = jsonResponse(payload, 200, { 'Cache-Control': CACHE_CONTROL });
    await putEdgeCache(context, edgeCache, cacheKey, response);
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
  }
}
