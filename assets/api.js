const MAPS_STORAGE_KEY = 'ddnet_maps_cache_v2';
const MAPS_FRESH_TTL_MS = 15 * 60 * 1000;
const MAPS_STALE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DETAIL_TTL_MS = 5 * 60 * 1000;
const PLAYER_TTL_MS = 2 * 60 * 1000;
const SERVERS_TTL_MS = 30 * 1000;
const SKINS_TTL_MS = 15 * 60 * 1000;

let mapsMemoryCache = null;
let serversMemoryCache = null;
let skinsMemoryCache = null;
const mapDetailCache = new Map();
const playerProfileCache = new Map();
let suggestController = null;

function readStoredMaps() {
  try {
    const raw = localStorage.getItem(MAPS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.maps) || parsed.maps.length === 0) return null;
    const age = Date.now() - Number(parsed.cachedAt || 0);
    if (age > MAPS_STALE_TTL_MS) {
      localStorage.removeItem(MAPS_STORAGE_KEY);
      return null;
    }
    return {
      ...parsed,
      isFresh: age >= 0 && age < MAPS_FRESH_TTL_MS,
    };
  } catch {
    return null;
  }
}

function writeStoredMaps(payload) {
  try {
    localStorage.setItem(
      MAPS_STORAGE_KEY,
      JSON.stringify({
        cachedAt: Date.now(),
        fetchedAt: payload.fetchedAt || new Date().toISOString(),
        lastModified: payload.lastModified || null,
        count: payload.maps.length,
        maps: payload.maps,
      })
    );
  } catch {
    // Storage quota full or disabled; in-memory cache still holds catalog
  }
}

export async function fetchMaps({ forceRefresh = false } = {}) {
  if (!forceRefresh && mapsMemoryCache && Date.now() - mapsMemoryCache.cachedAt < MAPS_FRESH_TTL_MS) {
    return mapsMemoryCache;
  }

  const endpoint = forceRefresh ? '/api/maps?refresh=1' : '/api/maps';
  try {
    const res = await fetch(endpoint, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data || !Array.isArray(data.maps)) throw new Error('Invalid catalog payload');

    writeStoredMaps(data);
    mapsMemoryCache = {
      cachedAt: Date.now(),
      fetchedAt: data.fetchedAt || new Date().toISOString(),
      lastModified: data.lastModified || null,
      count: data.maps.length,
      maps: data.maps,
      fromStaleCache: false,
    };
    return mapsMemoryCache;
  } catch (err) {
    const fallback = readStoredMaps();
    if (fallback) {
      mapsMemoryCache = { ...fallback, cachedAt: Date.now(), fromStaleCache: true };
      return mapsMemoryCache;
    }
    throw err;
  }
}

export async function fetchMapDetail(mapName) {
  const key = String(mapName || '').trim();
  if (!key) throw new Error('Empty map name');

  const cached = mapDetailCache.get(key);
  if (cached && Date.now() - cached.ts < DETAIL_TTL_MS) {
    return cached.data;
  }

  const res = await fetch(`/api/map?name=${encodeURIComponent(key)}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  mapDetailCache.set(key, { ts: Date.now(), data });
  return data;
}

export async function fetchPlayerSuggestions(query) {
  const q = String(query || '').trim();
  if (q.length < 2) return [];

  if (suggestController) {
    suggestController.abort();
  }
  suggestController = new AbortController();

  const res = await fetch(`/api/player?query=${encodeURIComponent(q)}`, {
    signal: suggestController.signal,
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchPlayerProfile(playerName) {
  const key = String(playerName || '').trim();
  if (!key) throw new Error('Empty player name');

  const cached = playerProfileCache.get(key.toLowerCase());
  if (cached && Date.now() - cached.ts < PLAYER_TTL_MS) {
    return cached.data;
  }

  const res = await fetch(`/api/player?name=${encodeURIComponent(key)}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  playerProfileCache.set(key.toLowerCase(), { ts: Date.now(), data });
  return data;
}

export async function fetchOnlineStats() {
  const res = await fetch('/api/online', { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchServers({ forceRefresh = false } = {}) {
  if (
    !forceRefresh &&
    serversMemoryCache &&
    Date.now() - serversMemoryCache.cachedAt < SERVERS_TTL_MS
  ) {
    return serversMemoryCache.data;
  }

  const endpoint = forceRefresh ? '/api/servers?refresh=1' : '/api/servers';
  const res = await fetch(endpoint, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data || !Array.isArray(data.servers)) throw new Error('Invalid servers payload');
  serversMemoryCache = { cachedAt: Date.now(), data };
  return data;
}

export async function fetchSkins({ forceRefresh = false } = {}) {
  if (
    !forceRefresh &&
    skinsMemoryCache &&
    Date.now() - skinsMemoryCache.cachedAt < SKINS_TTL_MS
  ) {
    return skinsMemoryCache.data;
  }

  const endpoint = forceRefresh ? '/api/skins?refresh=1' : '/api/skins';
  const res = await fetch(endpoint, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data || !Array.isArray(data.skins)) throw new Error('Invalid skins payload');
  skinsMemoryCache = { cachedAt: Date.now(), data };
  return data;
}
