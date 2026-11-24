import {
  COMMUNITY_META,
  CORS_HEADERS,
  fetchMasterSnapshot,
  fetchStatusTwJson,
  inferLiveCategory,
  jsonResponse,
  putEdgeCache,
  safeHttpUrl,
} from '../_shared/live.js';

const CACHE_CONTROL_DDNET = 'public, max-age=120, s-maxage=300, stale-while-revalidate=600';
const CACHE_CONTROL_COMMUNITY = 'public, max-age=60, s-maxage=120, stale-while-revalidate=300';

async function fetchDdnetMap(name) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const upstream = await fetch(`https://ddnet.org/maps/?json=${encodeURIComponent(name)}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'DDNet-Archive/2.1',
        Accept: 'application/json',
      },
    });
    if (upstream.status === 404) return { status: 404, data: null };
    if (!upstream.ok) return { status: upstream.status, data: null, error: true };
    const ct = upstream.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return { status: 502, data: null, error: true };
    const data = await upstream.json();
    if (!data || typeof data !== 'object' || !data.name) {
      return { status: 404, data: null };
    }
    return { status: 200, data };
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeStatusServer(srv) {
  const ip = typeof srv?.ip === 'string' ? srv.ip.trim() : '';
  const port = srv?.port;
  const address = ip && port ? `${ip}:${port}` : '';
  const clients = Array.isArray(srv?.clients)
    ? srv.clients
        .slice(0, 20)
        .map((c) => ({
          name: typeof c?.name === 'string' ? c.name.trim() : '',
          clan: typeof c?.clan === 'string' ? c.clan.trim() : '',
          score: typeof c?.score === 'number' && Number.isFinite(c.score) ? c.score : null,
          isPlayer: c?.isPlayer !== false,
          afk: Boolean(c?.isAfk),
        }))
        .filter((c) => c.name)
    : [];

  return {
    address,
    name: typeof srv?.name === 'string' && srv.name.trim() ? srv.name.trim() : address || 'Server',
    community: 'other',
    communityName: COMMUNITY_META.other.name,
    gameType: typeof srv?.gameType?.name === 'string' ? srv.gameType.name.trim() : '',
    region: '',
    country: typeof srv?.country?.identifier === 'string' ? srv.country.identifier.toUpperCase() : '',
    players: Number(srv?.numClients ?? srv?.numPlayers ?? clients.length ?? 0),
    maxPlayers: Number(srv?.maxClients ?? srv?.maxPlayers ?? 0),
    passworded: Boolean(srv?.hasPassword),
    mapSize: Number(srv?.map?.size || 0),
    mapSha256: typeof srv?.map?.sha256 === 'string' ? srv.map.sha256.trim() : '',
    mapUrl: '',
    clients,
  };
}

function buildOfficialLiveInfo(statusData) {
  if (!statusData || typeof statusData !== 'object' || !statusData.name) return null;
  const rawServers = Array.isArray(statusData.servers) ? statusData.servers : [];
  const servers = rawServers
    .map(normalizeStatusServer)
    .sort((a, b) => b.players - a.players || b.maxPlayers - a.maxPlayers || a.name.localeCompare(b.name))
    .slice(0, 10)
    .map((s) => ({
      name: s.name,
      address: s.address,
      players: s.players,
      maxPlayers: s.maxPlayers,
      gameType: s.gameType,
      country: s.country,
      passworded: s.passworded,
    }));

  return {
    numServers: Number(statusData.numServers || servers.length || 0),
    numPlayers: Number(statusData.numPlayers || 0),
    numClients: Number(statusData.numClients || 0),
    createdAt: typeof statusData.createdAt === 'string' ? statusData.createdAt : '',
    servers,
  };
}

/**
 * Proxies map details from ddnet.org and augments with live multi-community
 * server/mode metadata for both official DDNet maps and Block/Gores/FNG maps.
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

  try {
    const [ddnetRes, statusRes] = await Promise.all([
      fetchDdnetMap(name),
      fetchStatusTwJson(`/map/name/${encodeURIComponent(name)}`, 4500),
    ]);

    // Case A: Official DDNet map found
    if (ddnetRes.data) {
      const liveInfo = statusRes.ok ? buildOfficialLiveInfo(statusRes.data) : null;
      const payload = {
        ...ddnetRes.data,
        source: 'ddnet',
        liveInfo,
      };
      const response = jsonResponse(payload, 200, { 'Cache-Control': CACHE_CONTROL_DDNET });
      await putEdgeCache(context, edgeCache, cacheKey, response);
      return response;
    }

    // Case B: Non-catalog / Block / Gores / FNG / Community map
    const snapshot = await fetchMasterSnapshot(context, url.origin).catch(() => null);
    const lowerName = name.toLowerCase();

    const masterMatches = snapshot
      ? snapshot.servers.filter((s) => s.mapName && s.mapName.toLowerCase() === lowerName)
      : [];

    const hasStatusMap = Boolean(statusRes.ok && statusRes.data && statusRes.data.name);

    if (masterMatches.length === 0 && !hasStatusMap) {
      if (ddnetRes.error) {
        return jsonResponse(
          { error: 'Upstream map API error', status: ddnetRes.status },
          ddnetRes.status >= 500 ? 502 : ddnetRes.status,
          { 'Cache-Control': 'no-cache' }
        );
      }
      return jsonResponse({ error: 'Map not found', status: 404 }, 404, {
        'Cache-Control': 'public, max-age=60',
      });
    }

    const byAddress = new Map();
    for (const ms of masterMatches) {
      const key = ms.address || ms.name;
      byAddress.set(key, {
        address: ms.address,
        name: ms.name,
        community: ms.community,
        communityName: ms.communityName,
        gameType: ms.gameType,
        region: ms.region,
        country: ms.country,
        players: ms.players,
        maxPlayers: ms.maxPlayers,
        passworded: ms.passworded,
        mapSize: ms.mapSize,
        mapSha256: ms.mapSha256,
        mapUrl: ms.mapUrl,
        clients: Array.isArray(ms.clients) ? ms.clients.slice(0, 20) : [],
      });
    }

    if (hasStatusMap && Array.isArray(statusRes.data.servers)) {
      for (const rawSrv of statusRes.data.servers) {
        const s = normalizeStatusServer(rawSrv);
        const key = s.address || s.name;
        if (byAddress.has(key)) {
          const existing = byAddress.get(key);
          if (!existing.mapSize && s.mapSize) existing.mapSize = s.mapSize;
          if (!existing.mapSha256 && s.mapSha256) existing.mapSha256 = s.mapSha256;
          if (existing.clients.length === 0 && s.clients.length > 0) existing.clients = s.clients;
        } else {
          byAddress.set(key, s);
        }
      }
    }

    const mergedServers = Array.from(byAddress.values()).sort(
      (a, b) => b.players - a.players || b.maxPlayers - a.maxPlayers || a.name.localeCompare(b.name)
    );

    const commWeights = new Map();
    const gtWeights = new Map();
    const commSeen = new Map();
    let mapSize = 0;
    let mapSha256 = '';
    let mapDownloadUrl = '';

    const commIconById = new Map();
    if (snapshot) {
      for (const c of snapshot.communities) {
        commIconById.set(c.id, c.icon || '');
      }
    }

    for (const s of mergedServers) {
      const w = s.players > 0 ? s.players : 1;
      if (s.community) {
        commWeights.set(s.community, (commWeights.get(s.community) || 0) + w);
        if (!commSeen.has(s.community)) {
          commSeen.set(s.community, {
            id: s.community,
            name: s.communityName || COMMUNITY_META[s.community]?.name || s.community,
            icon: commIconById.get(s.community) || COMMUNITY_META[s.community]?.icon || '',
          });
        }
      }
      if (s.gameType) {
        gtWeights.set(s.gameType, (gtWeights.get(s.gameType) || 0) + w);
      }
      if (!mapSize && s.mapSize > 0) mapSize = s.mapSize;
      if (!mapSha256 && s.mapSha256) mapSha256 = s.mapSha256;
      if (!mapDownloadUrl && s.mapUrl) mapDownloadUrl = safeHttpUrl(s.mapUrl);
    }

    const pickWeighted = (m) => {
      let best = '';
      let max = -1;
      for (const [k, v] of m.entries()) {
        if (k === 'other' && m.size > 1) continue;
        if (v > max) {
          max = v;
          best = k;
        }
      }
      return best;
    };

    const primaryCommunity = pickWeighted(commWeights) || (commSeen.has('other') ? 'other' : 'community');
    const primaryCommObj = commSeen.get(primaryCommunity) || COMMUNITY_META.other;
    const primaryGameType = pickWeighted(gtWeights) || '';
    const canonicalName = statusRes.data?.name || masterMatches[0]?.mapName || name;

    const communities = Array.from(commSeen.values()).sort((a, b) => {
      if (a.id === 'other' && b.id !== 'other') return 1;
      if (b.id === 'other' && a.id !== 'other') return -1;
      return (commWeights.get(b.id) || 0) - (commWeights.get(a.id) || 0);
    });

    const masterPlayerTotal = masterMatches.reduce((acc, s) => acc + s.players, 0);
    const liveServersCount = Math.max(mergedServers.length, Number(statusRes.data?.numServers || 0));
    const livePlayersCount = Math.max(masterPlayerTotal, Number(statusRes.data?.numPlayers || 0));
    const liveClientsCount = Math.max(masterPlayerTotal, Number(statusRes.data?.numClients || 0));

    const payload = {
      source: 'community',
      name: canonicalName,
      type: inferLiveCategory(primaryGameType, canonicalName, primaryCommunity),
      gameType: primaryGameType,
      gameTypes: Array.from(gtWeights.keys()).sort(),
      primaryCommunity,
      primaryCommunityName: primaryCommObj.name,
      communities,
      firstSeen: typeof statusRes.data?.createdAt === 'string' ? statusRes.data.createdAt : '',
      liveServersCount,
      livePlayersCount,
      liveClientsCount,
      mapSize,
      mapSha256,
      mapDownloadUrl,
      servers: mergedServers.slice(0, 20),
    };

    const response = jsonResponse(payload, 200, { 'Cache-Control': CACHE_CONTROL_COMMUNITY });
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
