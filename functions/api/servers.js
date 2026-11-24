import {
  CORS_HEADERS,
  fetchMasterSnapshot,
  fetchStatusTwJson,
  jsonResponse,
  parseLocation,
  putEdgeCache,
} from '../_shared/live.js';

const CACHE_CONTROL = 'public, max-age=30, s-maxage=60, stale-while-revalidate=120';
const MAX_EMPTY_SERVERS = 250;

function selectServersForPayload(servers) {
  const active = [];
  const officialEmpty = [];
  const otherEmpty = [];

  for (const s of servers) {
    if (s.players > 0) {
      active.push(s);
    } else if (s.community !== 'other') {
      officialEmpty.push(s);
    } else {
      otherEmpty.push(s);
    }
  }

  const emptySlice = [...officialEmpty, ...otherEmpty].slice(0, MAX_EMPTY_SERVERS);
  return [...active, ...emptySlice];
}

/**
 * Returns live multi-community servers (DDNet, KoG, TeeFusion, Axiom, Unique, etc.),
 * active maps across the network, and weekly top servers.
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
  const cacheKey = new Request(`${url.origin}/api/servers`, { method: 'GET' });

  if (edgeCache && !bypassCache) {
    const cached = await edgeCache.match(cacheKey);
    if (cached) return cached;
  }

  try {
    const [snapshot, topRes] = await Promise.all([
      fetchMasterSnapshot(context, url.origin),
      fetchStatusTwJson('/server/top?limit=20', 4500),
    ]);

    const serverByAddr = new Map();
    for (const s of snapshot.servers) {
      if (s.address) serverByAddr.set(s.address, s);
    }

    const topWeekly = [];
    if (topRes.ok && Array.isArray(topRes.data)) {
      for (const item of topRes.data) {
        const ip = typeof item?.ip === 'string' ? item.ip.trim() : '';
        const port = item?.port;
        const address = ip && port ? `${ip}:${port}` : '';
        const on = item?.online && typeof item.online === 'object' ? item.online : {};
        const masterMatch = address ? serverByAddr.get(address) : null;
        const countryCode =
          typeof on?.country?.identifier === 'string'
            ? on.country.identifier.toUpperCase()
            : masterMatch?.country || '';

        topWeekly.push({
          address,
          name: on.name || masterMatch?.name || address || 'Unknown server',
          mapName: on?.map?.name || masterMatch?.mapName || '',
          gameType: on?.gameType?.name || masterMatch?.gameType || '',
          avgPlayers: typeof item.avgPlayers === 'number' ? Math.round(item.avgPlayers * 10) / 10 : 0,
          peakPlayers: typeof item.peakPlayers === 'number' ? item.peakPlayers : 0,
          players:
            typeof on.numClients === 'number'
              ? on.numClients
              : typeof on.numPlayers === 'number'
                ? on.numPlayers
                : masterMatch?.players || 0,
          maxPlayers:
            typeof on.maxClients === 'number'
              ? on.maxClients
              : typeof on.maxPlayers === 'number'
                ? on.maxPlayers
                : masterMatch?.maxPlayers || 0,
          country: countryCode,
          region: masterMatch?.region || parseLocation(countryCode ? `eu:${countryCode}` : '').region,
          community: masterMatch?.community || 'other',
          communityName: masterMatch?.communityName || 'Community Servers',
        });
      }
    }

    const payload = {
      totalPlayers: snapshot.totalPlayers,
      totalServers: snapshot.totalServers,
      activeServers: snapshot.activeServers,
      ddnetPlayers: snapshot.ddnetPlayers,
      ddnetServers: snapshot.ddnetServers,
      kogPlayers: snapshot.kogPlayers,
      kogServers: snapshot.kogServers,
      communities: snapshot.communities,
      gameTypes: snapshot.gameTypes,
      liveMaps: snapshot.liveMaps,
      servers: selectServersForPayload(snapshot.servers),
      topWeekly,
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
    return jsonResponse({ error: 'Failed to fetch live servers', status: 502 }, 502, {
      'Cache-Control': 'no-cache',
    });
  }
}
