import {
  CORS_HEADERS,
  fetchStatusTwJson,
  jsonResponse,
  putEdgeCache,
} from '../_shared/live.js';

const PROFILE_CACHE_CONTROL = 'public, max-age=60, s-maxage=120, stale-while-revalidate=300';
const QUERY_CACHE_CONTROL = 'public, max-age=60, s-maxage=120';

async function fetchDdnetJson(targetUrl, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'DDNet-Archive/2.1',
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      return { ok: false, status: response.status, data: null };
    }
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { ok: false, status: 502, data: null };
    }
    const data = await response.json();
    return { ok: true, status: response.status, data };
  } catch (err) {
    return {
      ok: false,
      status: err && err.name === 'AbortError' ? 504 : 502,
      data: null,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function mapOnlineSessions(playerEntry) {
  const list = Array.isArray(playerEntry?.players) ? playerEntry.players : [];
  return list
    .map((s) => {
      const srv = s?.server && typeof s.server === 'object' ? s.server : {};
      const address = srv.ip && srv.port ? `${srv.ip}:${srv.port}` : '';
      return {
        serverName: typeof srv.name === 'string' ? srv.name.trim() : '',
        address,
        mapName: typeof srv?.map?.name === 'string' ? srv.map.name.trim() : '',
        gameType: typeof srv?.gameType?.name === 'string' ? srv.gameType.name.trim() : '',
        score: typeof s?.score === 'number' && Number.isFinite(s.score) ? s.score : null,
        skin: typeof s?.skin?.name === 'string' ? s.skin.name.trim() : '',
        players: Number(srv.numClients ?? srv.numPlayers ?? 0),
        maxPlayers: Number(srv.maxClients ?? srv.maxPlayers ?? 0),
        country: typeof srv?.country?.identifier === 'string' ? srv.country.identifier.toUpperCase() : '',
        afk: Boolean(s?.isAfk),
      };
    })
    .filter((sess) => sess.serverName || sess.mapName);
}

function buildNetworkPayload(statusPlayerRes, statusStatsRes) {
  const playerObj = statusPlayerRes.ok && statusPlayerRes.data && statusPlayerRes.data.name ? statusPlayerRes.data : null;
  const statsObj = statusStatsRes.ok && statusStatsRes.data && typeof statusStatsRes.data === 'object' ? statusStatsRes.data : null;

  const sessions = playerObj ? mapOnlineSessions(playerObj) : [];
  const totalPlayTime = Number(statsObj?.totalPlayTime || 0);
  const sessionCount = Number(statsObj?.sessionCount || 0);
  const hasStats = sessionCount > 0 || totalPlayTime > 0;

  if (!playerObj && !hasStats) return null;

  const favSrv = statsObj?.favoriteServer && statsObj.favoriteServer.server ? statsObj.favoriteServer : null;
  const favMap = statsObj?.favoriteMap && statsObj.favoriteMap.name ? statsObj.favoriteMap : null;
  const favGt = statsObj?.favoriteGameType && statsObj.favoriteGameType.name ? statsObj.favoriteGameType : null;
  const daily = Array.isArray(statsObj?.dailyPlayTime) ? statsObj.dailyPlayTime.slice(-30) : [];

  return {
    createdAt: typeof playerObj?.createdAt === 'string' ? playerObj.createdAt : '',
    online: sessions.length > 0,
    sessions,
    totalPlayTime,
    sessionCount,
    avgSessionTime: Number(statsObj?.avgSessionTime || 0),
    longestSession: Number(statsObj?.longestSession || 0),
    favoriteServer: favSrv
      ? {
          name: favSrv.server?.name || '',
          address: favSrv.server?.ip && favSrv.server?.port ? `${favSrv.server.ip}:${favSrv.server.port}` : '',
          playTime: Number(favSrv.playTime || 0),
          sessionCount: Number(favSrv.sessionCount || 0),
          gameType: favSrv.server?.gameType?.name || '',
        }
      : null,
    favoriteMap: favMap
      ? {
          name: String(favMap.name),
          playTime: Number(favMap.playTime || 0),
        }
      : null,
    favoriteGameType: favGt
      ? {
          name: String(favGt.name),
          playTime: Number(favGt.playTime || 0),
        }
      : null,
    dailyPlayTime: daily.map((d) => ({
      date: typeof d?.date === 'string' ? d.date : '',
      playTime: Number(d?.playTime || 0),
    })),
  };
}

/**
 * Proxies DDNet player autocomplete (?query=...) and full profiles (?name=...),
 * enriched with cross-network live presence & playtime stats from api.status.tw.
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

    const [ddnetRes, statusListRes] = await Promise.all([
      fetchDdnetJson(`https://ddnet.org/players/?query=${encodeURIComponent(query)}`, 6000),
      fetchStatusTwJson(`/player/list?name=${encodeURIComponent(query)}`, 3500),
    ]);

    if (!ddnetRes.ok && !statusListRes.ok) {
      const status = ddnetRes.status === 504 ? 504 : 502;
      return jsonResponse({ error: 'API error', status }, status, { 'Cache-Control': 'no-cache' });
    }

    const onlineByLower = new Map();
    if (statusListRes.ok && Array.isArray(statusListRes.data)) {
      for (const entry of statusListRes.data) {
        const entryName = typeof entry?.name === 'string' ? entry.name.trim() : '';
        if (!entryName) continue;
        const sessions = mapOnlineSessions(entry);
        if (sessions.length > 0 && !onlineByLower.has(entryName.toLowerCase())) {
          onlineByLower.set(entryName.toLowerCase(), {
            name: entryName,
            session: sessions[0],
          });
        }
      }
    }

    const seenLower = new Set();
    const suggestions = [];

    if (ddnetRes.ok && Array.isArray(ddnetRes.data)) {
      for (const item of ddnetRes.data.slice(0, 10)) {
        const itemName = typeof item?.name === 'string' ? item.name.trim() : '';
        if (!itemName) continue;
        const lower = itemName.toLowerCase();
        seenLower.add(lower);
        const liveMatch = onlineByLower.get(lower);
        suggestions.push({
          name: itemName,
          points: typeof item.points === 'number' ? item.points : 0,
          source: 'ddnet',
          online: Boolean(liveMatch),
          currentServer: liveMatch?.session?.serverName || '',
          currentMap: liveMatch?.session?.mapName || '',
          gameType: liveMatch?.session?.gameType || '',
        });
      }
    }

    let extraAdded = 0;
    for (const [lower, liveMatch] of onlineByLower.entries()) {
      if (seenLower.has(lower)) continue;
      suggestions.push({
        name: liveMatch.name,
        points: 0,
        source: 'network',
        online: true,
        currentServer: liveMatch.session.serverName,
        currentMap: liveMatch.session.mapName,
        gameType: liveMatch.session.gameType,
      });
      extraAdded += 1;
      if (extraAdded >= 4) break;
    }

    const response = jsonResponse(suggestions, 200, { 'Cache-Control': QUERY_CACHE_CONTROL });
    await putEdgeCache(context, edgeCache, cacheKey, response);
    return response;
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

  const [ddnetRes, statusPlayerRes, statusStatsRes] = await Promise.all([
    fetchDdnetJson(`https://ddnet.org/players/?json2=${encodeURIComponent(playerName)}`, 8000),
    fetchStatusTwJson(`/player/name/${encodeURIComponent(playerName)}`, 4500),
    fetchStatusTwJson(`/player/name/${encodeURIComponent(playerName)}/stats`, 4500),
  ]);

  const hasDdnet = Boolean(ddnetRes.ok && ddnetRes.data && typeof ddnetRes.data === 'object' && ddnetRes.data.player);
  const network = buildNetworkPayload(statusPlayerRes, statusStatsRes);
  const hasNetwork = Boolean(network);

  if (!hasDdnet && !hasNetwork) {
    // Only fail with 502/504 if DDNet upstream actually errored (not 404 or empty {})
    if (!ddnetRes.ok && ddnetRes.status !== 404 && !statusPlayerRes.ok && statusPlayerRes.status !== 404) {
      const status = ddnetRes.status === 504 ? 504 : 502;
      return jsonResponse({ error: 'Proxy error', status }, status, {
        'Cache-Control': 'no-cache',
      });
    }
    return jsonResponse({ error: 'Player not found', status: 404 }, 404, {
      'Cache-Control': 'public, max-age=60',
    });
  }

  const payload = hasDdnet
    ? {
        ...ddnetRes.data,
        hasDdnetProfile: true,
        network,
      }
    : {
        player: statusPlayerRes.data?.name || playerName,
        hasDdnetProfile: false,
        network,
      };

  const response = jsonResponse(payload, 200, { 'Cache-Control': PROFILE_CACHE_CONTROL });
  await putEdgeCache(context, edgeCache, cacheKey, response);
  return response;
}
