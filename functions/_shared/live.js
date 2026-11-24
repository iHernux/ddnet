const MASTER_URL = 'https://master1.ddnet.org/ddnet/15/servers.json';
const INFO_URL = 'https://info.ddnet.org/info';
const STATUS_TW_ORIGIN = 'https://api.status.tw';
const USER_AGENT = 'DDNet-Archive/2.1';

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const COMMUNITY_META = {
  ddnet: {
    id: 'ddnet',
    name: 'DDraceNetwork',
    shortName: 'DDNet',
    icon: 'https://info.ddnet.org/icons/ddnet.png',
    website: 'https://ddnet.org',
  },
  kog: {
    id: 'kog',
    name: 'King of Gores',
    shortName: 'KoG',
    icon: 'https://info.ddnet.org/icons/kog.png',
    website: 'https://kog.tw',
  },
  teefusion: {
    id: 'teefusion',
    name: 'TeeFusion',
    shortName: 'TeeFusion',
    icon: 'https://info.ddnet.org/icons/teefusion.png',
    website: '',
  },
  axiom: {
    id: 'axiom',
    name: 'Axiom',
    shortName: 'Axiom',
    icon: 'https://info.ddnet.org/icons/axiom.png',
    website: '',
  },
  nobyfng: {
    id: 'nobyfng',
    name: "noby's fng",
    shortName: 'nobyfng',
    icon: 'https://info.ddnet.org/icons/nobyfng.png',
    website: '',
  },
  unique: {
    id: 'unique',
    name: 'Unique',
    shortName: 'Unique',
    icon: 'https://info.ddnet.org/icons/unique.png',
    website: 'https://uniqueclan.net',
  },
  blockworlds: {
    id: 'blockworlds',
    name: 'Blockworlds',
    shortName: 'Blockworlds',
    icon: 'https://info.ddnet.org/icons/blockworlds.png',
    website: 'https://blockworlds.tw',
  },
  ntcn: {
    id: 'ntcn',
    name: 'NewTeeworldsCN',
    shortName: 'NTCN',
    icon: 'https://info.ddnet.org/icons/ntcn.png',
    website: '',
  },
  other: {
    id: 'other',
    name: 'Community Servers',
    shortName: 'Community',
    icon: '',
    website: '',
  },
};

export function jsonResponse(payload, status, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

export async function putEdgeCache(context, edgeCache, cacheKey, response) {
  if (!edgeCache) return;
  const putPromise = edgeCache.put(cacheKey, response.clone());
  if (context && typeof context.waitUntil === 'function') {
    context.waitUntil(putPromise);
  } else {
    await putPromise;
  }
}

export function safeHttpUrl(raw) {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
    return '';
  } catch {
    return '';
  }
}

export function extractConnectAddress(addresses) {
  if (!Array.isArray(addresses) || addresses.length === 0) return '';
  const list = addresses.filter((a) => typeof a === 'string' && a.trim());
  if (list.length === 0) return '';

  const stripProto = (addr) => addr.replace(/^tw-[0-9.]+(?:\+udp)?:\/\//i, '').trim();

  const ipv4V6 = list.find((a) => /^tw-0\.6\b/i.test(a) && !a.includes('['));
  if (ipv4V6) return stripProto(ipv4V6);

  const anyV6 = list.find((a) => /^tw-0\.6\b/i.test(a));
  if (anyV6) return stripProto(anyV6);

  const ipv4V7 = list.find((a) => /^tw-0\.7\b/i.test(a) && !a.includes('['));
  if (ipv4V7) return stripProto(ipv4V7);

  const anyV7 = list.find((a) => /^tw-0\.7\b/i.test(a));
  if (anyV7) return stripProto(anyV7);

  return stripProto(list[0]);
}

const VALID_REGIONS = new Set(['eu', 'na', 'sa', 'as', 'af', 'oc']);

export function parseLocation(loc) {
  if (typeof loc !== 'string' || !loc.trim()) {
    return { region: 'other', country: '' };
  }
  const parts = loc.trim().split(':');
  const rawReg = (parts[0] || '').toLowerCase();
  const rawCountry = (parts[1] || '').toUpperCase();
  return {
    region: VALID_REGIONS.has(rawReg) ? rawReg : 'other',
    country: /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : '',
  };
}

export function inferLiveCategory(gameType, mapName = '', community = '') {
  const gt = String(gameType || '').trim();
  const map = String(mapName || '').trim();
  const comm = String(community || '').trim().toLowerCase();

  if (comm === 'kog' || /gores/i.test(gt)) return 'Gores';
  if (
    /block|0xf|ddr?acex|gameup|ddfightnet/i.test(gt) ||
    /\b(blmap|copy\s+love|copy\s+the\s+box)/i.test(map)
  ) {
    return 'Block';
  }
  if (/fng/i.test(gt)) return 'FNG';
  if (/^(race|fastcap|axrace)$/i.test(gt)) return 'Race';
  return 'Community';
}

async function fetchJsonTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchStatusTwJson(path, timeoutMs = 4500) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const res = await fetch(`${STATUS_TW_ORIGIN}${normalizedPath}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    return {
      ok: res.ok && data !== null,
      status: res.status,
      data,
    };
  } catch {
    return { ok: false, status: 0, data: null };
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildCommunityRegistry(infoPayload) {
  const registry = new Map();
  for (const [id, meta] of Object.entries(COMMUNITY_META)) {
    registry.set(id, {
      ...meta,
      contactUrls: meta.website ? [meta.website] : [],
    });
  }

  const list = Array.isArray(infoPayload?.communities) ? infoPayload.communities : [];
  for (const item of list) {
    const id = typeof item?.id === 'string' ? item.id.trim().toLowerCase() : '';
    if (!id) continue;
    const base = registry.get(id) || {
      id,
      name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : id,
      shortName: id,
      icon: '',
      website: '',
      contactUrls: [],
    };
    const safeIcon = safeHttpUrl(item?.icon?.url) || base.icon;
    const rawContacts = Array.isArray(item?.contact_urls) ? item.contact_urls : [];
    const safeContacts = rawContacts.map(safeHttpUrl).filter(Boolean);
    const mergedContacts = Array.from(new Set([...(base.website ? [base.website] : []), ...safeContacts]));

    registry.set(id, {
      id,
      name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : base.name,
      shortName: base.shortName || id,
      icon: safeIcon,
      website: base.website || safeContacts.find((u) => !u.includes('discord')) || '',
      contactUrls: mergedContacts,
    });
  }
  return registry;
}

function pickTopEntry(countsMap) {
  let bestKey = '';
  let bestVal = -1;
  for (const [k, v] of countsMap.entries()) {
    if (v > bestVal) {
      bestVal = v;
      bestKey = k;
    }
  }
  return bestKey;
}

export async function fetchMasterSnapshot(context, origin) {
  const edgeCache = typeof caches !== 'undefined' && caches.default ? caches.default : null;
  const cacheKey = origin ? new Request(`${origin}/_internal/master-snapshot-v1`, { method: 'GET' }) : null;

  if (edgeCache && cacheKey) {
    const cached = await edgeCache.match(cacheKey);
    if (cached) {
      try {
        return await cached.json();
      } catch {
        // Fall through to fresh fetch
      }
    }
  }

  const [masterData, infoData] = await Promise.all([
    fetchJsonTimeout(MASTER_URL, 8000),
    fetchJsonTimeout(INFO_URL, 5000).catch(() => null),
  ]);

  const registry = buildCommunityRegistry(infoData);
  const rawServers = Array.isArray(masterData?.servers) ? masterData.servers : [];

  let totalServers = 0;
  let totalPlayers = 0;
  let activeServers = 0;
  let ddnetServers = 0;
  let ddnetPlayers = 0;
  let kogServers = 0;
  let kogPlayers = 0;

  const servers = [];
  const commAgg = new Map();
  const liveMapAgg = new Map();
  const ddnetMapAgg = new Map();
  const gameTypeAgg = new Map();

  for (const raw of rawServers) {
    const info = raw?.info;
    if (!info || typeof info !== 'object') continue;

    totalServers += 1;
    const rawClients = Array.isArray(info.clients) ? info.clients : [];
    const players = rawClients.length;
    totalPlayers += players;
    if (players > 0) activeServers += 1;

    const rawComm = typeof raw.community === 'string' && raw.community.trim() ? raw.community.trim().toLowerCase() : 'other';
    if (!registry.has(rawComm)) {
      registry.set(rawComm, {
        id: rawComm,
        name: rawComm,
        shortName: rawComm,
        icon: '',
        website: '',
        contactUrls: [],
      });
    }
    const commMeta = registry.get(rawComm);

    if (rawComm === 'ddnet') {
      ddnetServers += 1;
      ddnetPlayers += players;
    } else if (rawComm === 'kog') {
      kogServers += 1;
      kogPlayers += players;
    }

    const address = extractConnectAddress(raw.addresses);
    const { region, country } = parseLocation(raw.location);
    const mapObj = info.map && typeof info.map === 'object' ? info.map : {};
    const mapName = typeof mapObj.name === 'string' ? mapObj.name.trim() : '';
    const mapSize = typeof mapObj.size === 'number' && Number.isFinite(mapObj.size) ? mapObj.size : 0;
    const mapSha256 = typeof mapObj.sha256 === 'string' ? mapObj.sha256.trim() : '';
    const mapUrl = safeHttpUrl(mapObj.url);
    const gameType = typeof info.game_type === 'string' ? info.game_type.trim() : '';
    const maxPlayers =
      typeof info.max_clients === 'number' && Number.isFinite(info.max_clients)
        ? info.max_clients
        : typeof info.max_players === 'number' && Number.isFinite(info.max_players)
          ? info.max_players
          : 0;

    const clients =
      players > 0
        ? rawClients
            .map((c) => ({
              name: typeof c?.name === 'string' ? c.name.trim() : '',
              clan: typeof c?.clan === 'string' ? c.clan.trim() : '',
              score: typeof c?.score === 'number' && Number.isFinite(c.score) ? c.score : null,
              isPlayer: c?.is_player !== false,
              afk: Boolean(c?.afk),
            }))
            .filter((c) => c.name)
        : [];

    const normalizedServer = {
      address,
      name: typeof info.name === 'string' && info.name.trim() ? info.name.trim() : address || 'Unnamed server',
      community: rawComm,
      communityName: commMeta.name,
      gameType,
      region,
      country,
      mapName,
      mapSize,
      mapSha256,
      mapUrl,
      players,
      maxPlayers,
      passworded: Boolean(info.passworded),
      requiresLogin: Boolean(info.requires_login),
      scoreKind: typeof info.client_score_kind === 'string' ? info.client_score_kind : '',
      clients,
    };
    servers.push(normalizedServer);

    // Community aggregation
    if (!commAgg.has(rawComm)) {
      commAgg.set(rawComm, {
        ...commMeta,
        servers: 0,
        activeServers: 0,
        players: 0,
        gtCounts: new Map(),
        mapCounts: new Map(),
      });
    }
    const cEntry = commAgg.get(rawComm);
    cEntry.servers += 1;
    cEntry.players += players;
    if (players > 0) cEntry.activeServers += 1;
    if (gameType) {
      cEntry.gtCounts.set(gameType, (cEntry.gtCounts.get(gameType) || 0) + (players > 0 ? players : 1));
    }
    if (mapName && players > 0) {
      cEntry.mapCounts.set(mapName, (cEntry.mapCounts.get(mapName) || 0) + players);
    }

    // GameType aggregation
    if (gameType) {
      const gtEntry = gameTypeAgg.get(gameType);
      if (gtEntry) {
        gtEntry.servers += 1;
        gtEntry.players += players;
      } else {
        gameTypeAgg.set(gameType, { name: gameType, servers: 1, players });
      }
    }

    // Live map aggregation (across all communities)
    if (mapName && players > 0) {
      let mEntry = liveMapAgg.get(mapName);
      if (!mEntry) {
        mEntry = {
          name: mapName,
          players: 0,
          servers: 0,
          commPlayers: new Map(),
          gtPlayers: new Map(),
          communitiesSet: new Set(),
          gameTypesSet: new Set(),
          mapUrl: '',
          mapSize: 0,
        };
        liveMapAgg.set(mapName, mEntry);
      }
      mEntry.players += players;
      mEntry.servers += 1;
      mEntry.commPlayers.set(rawComm, (mEntry.commPlayers.get(rawComm) || 0) + players);
      mEntry.communitiesSet.add(rawComm);
      if (gameType) {
        mEntry.gtPlayers.set(gameType, (mEntry.gtPlayers.get(gameType) || 0) + players);
        mEntry.gameTypesSet.add(gameType);
      }
      if (!mEntry.mapUrl && mapUrl) mEntry.mapUrl = mapUrl;
      if (!mEntry.mapSize && mapSize > 0) mEntry.mapSize = mapSize;

      if (rawComm === 'ddnet') {
        let dmEntry = ddnetMapAgg.get(mapName);
        if (!dmEntry) {
          dmEntry = {
            name: mapName,
            players: 0,
            servers: 0,
            gtPlayers: new Map(),
          };
          ddnetMapAgg.set(mapName, dmEntry);
        }
        dmEntry.players += players;
        dmEntry.servers += 1;
        if (gameType) {
          dmEntry.gtPlayers.set(gameType, (dmEntry.gtPlayers.get(gameType) || 0) + players);
        }
      }
    }
  }

  servers.sort((a, b) => b.players - a.players || b.maxPlayers - a.maxPlayers || a.name.localeCompare(b.name));

  const communities = Array.from(commAgg.values())
    .map((c) => ({
      id: c.id,
      name: c.name,
      shortName: c.shortName,
      icon: c.icon,
      website: c.website,
      contactUrls: c.contactUrls,
      servers: c.servers,
      activeServers: c.activeServers,
      players: c.players,
      topGameTypes: Array.from(c.gtCounts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 3)
        .map(([name]) => name),
      topMaps: Array.from(c.mapCounts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 3)
        .map(([name, p]) => ({ name, players: p })),
    }))
    .sort((a, b) => {
      if (b.players !== a.players) return b.players - a.players;
      if (a.id === 'other' && b.id !== 'other') return 1;
      if (b.id === 'other' && a.id !== 'other') return -1;
      return b.servers - a.servers || a.name.localeCompare(b.name);
    });

  const liveMaps = Array.from(liveMapAgg.values())
    .map((m) => {
      const primaryCommunity = pickTopEntry(m.commPlayers) || 'other';
      const primaryCommMeta = registry.get(primaryCommunity) || COMMUNITY_META.other;
      const gameType = pickTopEntry(m.gtPlayers) || '';
      return {
        name: m.name,
        players: m.players,
        servers: m.servers,
        primaryCommunity,
        primaryCommunityName: primaryCommMeta.name,
        communities: Array.from(m.communitiesSet),
        gameType,
        gameTypes: Array.from(m.gameTypesSet).sort(),
        category: inferLiveCategory(gameType, m.name, primaryCommunity),
        mapUrl: m.mapUrl,
        mapSize: m.mapSize,
      };
    })
    .sort((a, b) => b.players - a.players || b.servers - a.servers || a.name.localeCompare(b.name));

  const ddnetTopMaps = Array.from(ddnetMapAgg.values())
    .map((m) => {
      const gameType = pickTopEntry(m.gtPlayers) || 'DDraceNetwork';
      return {
        name: m.name,
        players: m.players,
        servers: m.servers,
        gameType,
        category: inferLiveCategory(gameType, m.name, 'ddnet'),
        community: 'ddnet',
      };
    })
    .sort((a, b) => b.players - a.players || b.servers - a.servers || a.name.localeCompare(b.name))
    .slice(0, 15);

  const gameTypes = Array.from(gameTypeAgg.values())
    .sort((a, b) => b.players - a.players || b.servers - a.servers || a.name.localeCompare(b.name))
    .slice(0, 30);

  const snapshot = {
    totalPlayers,
    totalServers,
    activeServers,
    ddnetPlayers,
    ddnetServers,
    kogPlayers,
    kogServers,
    communities,
    gameTypes,
    liveMaps,
    ddnetTopMaps,
    servers,
    updatedAt: new Date().toISOString(),
  };

  if (edgeCache && cacheKey) {
    const cacheRes = new Response(JSON.stringify(snapshot), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    });
    await putEdgeCache(context, edgeCache, cacheKey, cacheRes);
  }

  return snapshot;
}
