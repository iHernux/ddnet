import { CORS_HEADERS, jsonResponse } from '../_shared/live.js';

const SKINS_JSON_URL = 'https://skins.ddnet.org/skin/skins.json';
const USER_AGENT = 'DDNet-Archive/2.2';
const CACHE_CONTROL = 'public, max-age=1800, s-maxage=3600';

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get('refresh') === '1';
  const cache = caches.default;
  const cacheKey = new Request(`${url.origin}/api/skins`, { method: 'GET' });

  if (!forceRefresh) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(SKINS_JSON_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      return jsonResponse({ error: `Upstream returned HTTP ${res.status}` }, 502);
    }
    const raw = await res.json();
    const rawList = Array.isArray(raw?.skins) ? raw.skins : [];

    const skins = [];
    let normalCount = 0;
    let communityCount = 0;
    let uhdCount = 0;

    for (const s of rawList) {
      if (!s || !s.name) continue;
      if (s.gameversion && s.gameversion !== 'tw-0.6') continue;
      if (s.bodypart && s.bodypart !== 'full') continue;
      if (s.imgtype && s.imgtype !== 'png') continue;

      const type = s.type === 'community' ? 'community' : 'normal';
      const uhd = Boolean(s.hd?.uhd);
      if (type === 'community') communityCount += 1;
      else normalCount += 1;
      if (uhd) uhdCount += 1;

      skins.push({
        name: String(s.name),
        type,
        creator: typeof s.creator === 'string' ? s.creator : '',
        license: typeof s.license === 'string' ? s.license : '',
        skinpack: typeof s.skinpack === 'string' ? s.skinpack : '',
        date: typeof s.date === 'string' ? s.date : '',
        uhd,
      });
    }

    const response = jsonResponse(
      {
        total: skins.length,
        normalCount,
        communityCount,
        uhdCount,
        skins,
        updatedAt: new Date().toISOString(),
      },
      200,
      { 'Cache-Control': CACHE_CONTROL }
    );

    context.waitUntil?.(cache.put(cacheKey, response.clone()));
    return response;
  } catch (err) {
    return jsonResponse(
      { error: err?.name === 'AbortError' ? 'Upstream timeout' : 'Failed to load skins catalog' },
      504
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
